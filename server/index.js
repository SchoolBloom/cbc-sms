import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: new URL("./.env.server", import.meta.url).pathname });

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_SECURE,
  SMTP_REPLY_TO,
  CORS_ORIGIN,
  SERVER_PORT,
} = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(express.json({ limit: "1mb" }));
const defaultCorsOrigins = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
app.use(
  cors({
    origin: CORS_ORIGIN?.split(",").map((origin) => origin.trim()) || defaultCorsOrigins,
  })
);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 587,
  secure: SMTP_SECURE === "true",
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
});

function chunkArray(list, size) {
  const chunks = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

async function getAuthorizedUser(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { user: null, error: "Missing bearer token." };
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: "Invalid access token." };
  }

  return { user: data.user, error: null };
}

async function isSystemAdmin(userId) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "system_admin")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function hasAnyRole(userId, roles) {
  const normalized = Array.isArray(roles) ? roles : [];
  if (normalized.length === 0) return false;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", normalized);

  if (error) throw error;
  return (data || []).length > 0;
}

function formatDayLabel(value) {
  return new Date(value).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

async function getRecipients(targetAudience) {
  const includeAll = targetAudience.includes("all");
  const includeTeachers = includeAll || targetAudience.includes("teachers");
  const includeParents = includeAll || targetAudience.includes("parents");

  const recipients = new Set();

  if (includeTeachers) {
    const { data, error } = await supabase
      .from("teachers")
      .select("email")
      .not("email", "is", null);
    if (error) throw error;
    data?.forEach((row) => row.email && recipients.add(row.email));
  }

  if (includeParents) {
    const { data, error } = await supabase
      .from("parents")
      .select("email")
      .not("email", "is", null);
    if (error) throw error;
    data?.forEach((row) => row.email && recipients.add(row.email));
  }

  return Array.from(recipients);
}

function buildEmail(notice) {
  const subject = `[School Bloom] ${notice.title}`;
  const text = `${notice.title}\n\n${notice.content}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1b1b1b;">
      <h2 style="margin:0 0 12px;">${notice.title}</h2>
      <p style="margin:0 0 12px;white-space:pre-line;">${notice.content}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#666;">School Bloom Notice</p>
    </div>
  `;
  return { subject, text, html };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), service: "school-bloom-api" });
});

app.post("/api/system/schools", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const {
      schoolName,
      schoolCode,
      county,
      subcounty,
      schoolEmail,
      schoolPhone,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      schoolCategories,
    } = req.body || {};

    const normalizedCategories = Array.isArray(schoolCategories)
      ? Array.from(new Set(schoolCategories.filter((value) =>
          value === "primary_junior_secondary" || value === "senior_secondary"
        )))
      : [];

    if (!schoolName || !schoolCode || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: "School and administrator details are required." });
    }

    if (normalizedCategories.length === 0) {
      return res.status(400).json({ error: "At least one school category must be selected." });
    }

    if (String(adminPassword).length < 6) {
      return res.status(400).json({ error: "Administrator password must be at least 6 characters." });
    }

    let createdAdminUserId = null;
    let createdSchoolId = null;

    try {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: String(adminEmail).trim().toLowerCase(),
        password: String(adminPassword),
        email_confirm: true,
        user_metadata: {
          full_name: String(adminName).trim(),
        },
      });

      if (createUserError) throw createUserError;
      createdAdminUserId = createdUser.user.id;

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .insert({
          name: String(schoolName).trim(),
          code: String(schoolCode).trim().toUpperCase(),
          county: county ? String(county).trim() : null,
          subcounty: subcounty ? String(subcounty).trim() : null,
          contact_email: schoolEmail ? String(schoolEmail).trim().toLowerCase() : null,
          contact_phone: schoolPhone ? String(schoolPhone).trim() : null,
          administrator_name: String(adminName).trim(),
          administrator_email: String(adminEmail).trim().toLowerCase(),
          administrator_phone: adminPhone ? String(adminPhone).trim() : null,
          admin_user_id: createdAdminUserId,
          school_categories: normalizedCategories,
          created_by: user.id,
          status: "active",
        })
        .select("id, name, code, school_categories, created_at")
        .single();

      if (schoolError) throw schoolError;
      createdSchoolId = school.id;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: String(adminName).trim(),
          email: String(adminEmail).trim().toLowerCase(),
          phone: adminPhone ? String(adminPhone).trim() : null,
          school_id: school.id,
        })
        .eq("user_id", createdAdminUserId);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert([
          {
            user_id: createdAdminUserId,
            role: "admin",
          },
          {
            user_id: createdAdminUserId,
            role: "teacher",
          }
        ]);

      if (roleError) throw roleError;

      // Create teacher record for the admin
      const { error: teacherError } = await supabase
        .from("teachers")
        .upsert({
          user_id: createdAdminUserId,
          full_name: String(adminName).trim(),
          email: String(adminEmail).trim().toLowerCase() || null,
          phone: adminPhone ? String(adminPhone).trim() : null,
        }, { onConflict: "user_id" });

      if (teacherError) throw teacherError;

      return res.status(201).json({
        ok: true,
        school,
        admin: {
          user_id: createdAdminUserId,
          full_name: String(adminName).trim(),
          email: String(adminEmail).trim().toLowerCase(),
        },
      });
    } catch (innerError) {
      if (createdSchoolId) {
        await supabase.from("schools").delete().eq("id", createdSchoolId).catch(() => undefined);
      }
      if (createdAdminUserId) {
        await supabase.auth.admin.deleteUser(createdAdminUserId).catch(() => undefined);
      }
      throw innerError;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to register school." });
  }
});

app.get("/api/system/summary", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const [schoolsResult, profilesResult, rolesResult] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name, code, county, subcounty, school_categories, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("user_roles")
        .select("role"),
    ]);

    if (schoolsResult.error) throw schoolsResult.error;
    if (profilesResult.error) throw profilesResult.error;
    if (rolesResult.error) throw rolesResult.error;

    const schools = schoolsResult.data || [];
    const profiles = profilesResult.data || [];
    const roles = rolesResult.data || [];

    const roleBreakdown = roles.reduce((acc, item) => {
      acc[item.role] = (acc[item.role] || 0) + 1;
      return acc;
    }, {});

    const today = new Date();
    const signupSeries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const count = profiles.filter((profile) => profile.created_at.slice(0, 10) === key).length;
      return {
        date: key,
        label: formatDayLabel(date),
        count,
      };
    });

    const schoolsWithBasic = schools.filter((school) =>
      (school.school_categories || []).includes("primary_junior_secondary")
    ).length;
    const schoolsWithSenior = schools.filter((school) =>
      (school.school_categories || []).includes("senior_secondary")
    ).length;
    const schoolsWithBoth = schools.filter((school) => {
      const categories = school.school_categories || [];
      return categories.includes("primary_junior_secondary") && categories.includes("senior_secondary");
    }).length;

    return res.json({
      ok: true,
      metrics: {
        totalSchools: schools.length,
        activeSchools: schools.filter((school) => school.status === "active").length,
        onboardingSchools: schools.filter((school) => school.status === "onboarding").length,
        schoolsWithBasic,
        schoolsWithSenior,
        schoolsWithBoth,
        totalSignups: profiles.length,
        assignedRoles: roles.length,
        roleBreakdown,
      },
      schools,
      signupSeries,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load system summary." });
  }
});

app.get("/api/system/librarians-count", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const { count, error } = await supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "librarian");

    if (error) throw error;

    return res.json({ count: count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load librarian count." });
  }
});

app.get("/api/system/students-count", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const { count, error } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return res.json({ count: count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load student count." });
  }
});

app.get("/api/system/schools-list", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const { data: schools, error } = await supabase
      .from("schools")
      .select("id, name, code, administrator_name, administrator_email, administrator_phone, admin_user_id, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ schools: schools || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load schools." });
  }
});

app.put("/api/system/schools/:schoolId/admin", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const authorized = await isSystemAdmin(user.id);
    if (!authorized) {
      return res.status(403).json({ error: "System admin access required." });
    }

    const { schoolId } = req.params;
    const { adminName, adminEmail, adminPhone, adminPassword } = req.body || {};

    if (!adminName || !adminEmail) {
      return res.status(400).json({ error: "Administrator name and email are required." });
    }

    const normalizedEmail = String(adminEmail).trim().toLowerCase();

    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("id, admin_user_id, administrator_email")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError) throw schoolError;
    if (!school) {
      return res.status(404).json({ error: "School not found." });
    }

    const previousAdminEmail = school.administrator_email;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    let newAdminUserId = existingProfile?.user_id;

    if (!newAdminUserId) {
      if (!adminPassword) {
        return res.status(400).json({ error: "A password is required when creating a new admin account." });
      }

      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: adminName,
        },
      });

      if (createUserError) throw createUserError;
      newAdminUserId = newUser.user.id;
    }

    await supabase
      .from("profiles")
      .upsert({
        user_id: newAdminUserId,
        full_name: adminName,
        email: normalizedEmail,
        phone: adminPhone ? String(adminPhone).trim() : null,
        school_id: schoolId,
      }, { onConflict: "user_id" });

    if (school.admin_user_id && school.admin_user_id !== newAdminUserId) {
      const { error: removeRoleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", school.admin_user_id)
        .eq("role", "admin");

      if (removeRoleError) throw removeRoleError;
    }

    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", newAdminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!existingRole) {
      const { error: addRoleError } = await supabase
        .from("user_roles")
        .insert({ user_id: newAdminUserId, role: "admin" });

      if (addRoleError) throw addRoleError;
    }

    const { error: updateSchoolError } = await supabase
      .from("schools")
      .update({
        administrator_name: String(adminName).trim(),
        administrator_email: normalizedEmail,
        administrator_phone: adminPhone ? String(adminPhone).trim() : null,
        admin_user_id: newAdminUserId,
      })
      .eq("id", schoolId);

    if (updateSchoolError) throw updateSchoolError;

    return res.json({
      ok: true,
      message: "School administrator updated successfully",
      previousAdminEmail,
      newAdminEmail: normalizedEmail,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to update administrator." });
  }
});

app.post("/api/notices/:id/email", async (req, res) => {
  try {
    if (!SMTP_HOST || !SMTP_FROM) {
      return res.status(400).json({ error: "SMTP is not configured." });
    }

    const noticeId = req.params.id;
    const { data: notice, error } = await supabase
      .from("notices")
      .select("id, title, content, priority, target_audience, published, published_at")
      .eq("id", noticeId)
      .maybeSingle();

    if (error) throw error;
    if (!notice) return res.status(404).json({ error: "Notice not found." });
    if (!notice.published) {
      return res.status(400).json({ error: "Notice is not published." });
    }

    res.status(202).json({ ok: true, queued: true });

    setImmediate(async () => {
      try {
        const recipients = await getRecipients(notice.target_audience || ["all"]);
        if (recipients.length === 0) return;

        const { subject, text, html } = buildEmail(notice);
        const batches = chunkArray(recipients, 50);
        let sent = 0;

        for (const batch of batches) {
          await transporter.sendMail({
            from: SMTP_FROM,
            to: SMTP_FROM,
            bcc: batch,
            subject,
            text,
            html,
            replyTo: SMTP_REPLY_TO || undefined,
          });
          sent += batch.length;
        }

        console.log(`Notice ${notice.id} emails sent: ${sent}`);
      } catch (sendError) {
        console.error("Failed to send notice emails:", sendError);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send notice emails." });
  }
});

// ============ TIMETABLE API ENDPOINTS ============

// Get all timetables for a school (admin/teacher view)
app.get("/api/timetables", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    const allowed = await hasAnyRole(user.id, ["admin", "teacher"]);
    if (!allowed) {
      return res.status(403).json({ error: "Admin or teacher access required." });
    }

    const { academic_year, term, grade } = req.query;

    let query = supabase
      .from("timetables")
      .select(`
        *,
        timetable_slots (
          id,
          day_of_week,
          period_number,
          subject,
          teacher_id,
          room,
          start_time,
          end_time,
          slot_type,
          label,
          teachers:teacher_id (full_name)
        )
      `)
      .order("grade")
      .order("stream");

    if (academic_year) query = query.eq("academic_year", academic_year);
    if (term) query = query.eq("term", parseInt(term));
    if (grade) query = query.eq("grade", grade);

    const { data, error } = await query;

    if (error) throw error;
    return res.json({ timetables: data || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load timetables." });
  }
});

// Get teacher's personal timetable
app.get("/api/timetables/teacher", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    // Get teacher record
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teacherError) throw teacherError;
    if (!teacher) {
      return res.status(403).json({ error: "Teacher access required." });
    }

    if (teacherError) throw teacherError;
    if (!teacher) {
      return res.status(404).json({ error: "Teacher profile not found." });
    }

    const { academic_year, term } = req.query;

    // Get all timetable slots for this teacher
    const { data: slots, error: slotsError } = await supabase
      .from("timetable_slots")
      .select(`
        id,
        day_of_week,
        period_number,
        subject,
        room,
        start_time,
        end_time,
        timetable_id,
        timetables:timetable_id (
          grade,
          stream,
          academic_year,
          term
        )
      `)
      .eq("teacher_id", teacher.id)
      .order("day_of_week")
      .order("period_number");

    if (slotsError) throw slotsError;

    // Filter by academic_year and term if provided
    let filteredSlots = slots || [];
    if (academic_year) {
      filteredSlots = filteredSlots.filter(s => s.timetables?.academic_year === academic_year);
    }
    if (term) {
      filteredSlots = filteredSlots.filter(s => s.timetables?.term === parseInt(term));
    }

    return res.json({ slots: filteredSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load teacher timetable." });
  }
});

// Create a new timetable
app.post("/api/timetables", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    // Check admin role
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role) {
      return res.status(403).json({ error: "Admin access required." });
    }

    const { grade, stream, academic_year, term, slots } = req.body || {};

    if (!grade || !academic_year) {
      return res.status(400).json({ error: "Grade and academic year are required." });
    }

    // Create timetable
    const { data: timetable, error: timetableError } = await supabase
      .from("timetables")
      .insert({
        grade,
        stream: stream || null,
        academic_year,
        term: term || 1,
        created_by: user.id,
      })
      .select()
      .single();

    if (timetableError) throw timetableError;

    const effectiveTerm = term || 1;

    // Add slots if provided
    if (slots && slots.length > 0) {
      const seen = new Set();
      for (const slot of slots) {
        const key = `${slot.day_of_week}:${slot.period_number}`;
        if (seen.has(key)) {
          return res.status(400).json({ error: `Duplicate slot for day ${slot.day_of_week} period ${slot.period_number}.` });
        }
        seen.add(key);
        const hasStart = Boolean(slot.start_time);
        const hasEnd = Boolean(slot.end_time);
        if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
          return res.status(400).json({ error: "Both start_time and end_time must be provided together." });
        }

        const slotType = slot.slot_type || "lesson";
        if (slotType !== "lesson" && slotType !== "break") {
          return res.status(400).json({ error: "slot_type must be 'lesson' or 'break'." });
        }
        if (slotType === "break" && slot.teacher_id) {
          return res.status(400).json({ error: "Break slots cannot have a teacher assigned." });
        }
        if (slotType === "break" && !slot.label && !slot.subject) {
          return res.status(400).json({ error: "Break slots require a label (e.g. Lunch Break)." });
        }
      }

      const teacherIds = Array.from(new Set(slots.map((slot) => slot.teacher_id).filter(Boolean)));
      if (teacherIds.length > 0) {
        const { data: teacherConflicts, error: teacherConflictsError } = await supabase
          .from("timetable_slots")
          .select(`
            id,
            teacher_id,
            day_of_week,
            period_number,
            timetables:timetable_id (academic_year, term, grade, stream)
          `)
          .in("teacher_id", teacherIds);

        if (teacherConflictsError) throw teacherConflictsError;

        const conflicts = (teacherConflicts || []).filter((existing) => {
          const t = existing.timetables;
          if (!t) return false;
          if (t.academic_year !== academic_year) return false;
          if (t.term !== effectiveTerm) return false;
          return slots.some(
            (incoming) =>
              incoming.teacher_id &&
              incoming.teacher_id === existing.teacher_id &&
              incoming.day_of_week === existing.day_of_week &&
              incoming.period_number === existing.period_number
          );
        });

        if (conflicts.length > 0) {
          const first = conflicts[0];
          const t = first.timetables;
          return res.status(409).json({
            error: `Teacher conflict: already assigned on day ${first.day_of_week}, period ${first.period_number} (${t.grade}${t.stream ? ` ${t.stream}` : ""}).`,
          });
        }
      }

      const slotsToInsert = slots.map((slot) => ({
        timetable_id: timetable.id,
        day_of_week: slot.day_of_week,
        period_number: slot.period_number,
        subject: slot.subject || (slot.slot_type === "break" ? "Break" : null),
        teacher_id: slot.teacher_id || null,
        room: slot.room || null,
        start_time: slot.start_time || null,
        end_time: slot.end_time || null,
        slot_type: slot.slot_type || "lesson",
        label: slot.label || null,
      }));

      const { error: slotsError } = await supabase
        .from("timetable_slots")
        .insert(slotsToInsert);

      if (slotsError) throw slotsError;
    }

    return res.status(201).json({ ok: true, timetable });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to create timetable." });
  }
});

// Update timetable slots
app.put("/api/timetables/:timetableId/slots", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    // Check admin role
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role) {
      return res.status(403).json({ error: "Admin access required." });
    }

    const { timetableId } = req.params;
    const { slots } = req.body || {};

    if (!slots || !Array.isArray(slots)) {
      return res.status(400).json({ error: "Slots array is required." });
    }

    const { data: timetableMeta, error: metaError } = await supabase
      .from("timetables")
      .select("id, academic_year, term")
      .eq("id", timetableId)
      .maybeSingle();

    if (metaError) throw metaError;
    if (!timetableMeta) {
      return res.status(404).json({ error: "Timetable not found." });
    }

    const seen = new Set();
    for (const slot of slots) {
      const key = `${slot.day_of_week}:${slot.period_number}`;
      if (seen.has(key)) {
        return res.status(400).json({ error: `Duplicate slot for day ${slot.day_of_week} period ${slot.period_number}.` });
      }
      seen.add(key);
      const hasStart = Boolean(slot.start_time);
      const hasEnd = Boolean(slot.end_time);
      if ((hasStart && !hasEnd) || (!hasStart && hasEnd)) {
        return res.status(400).json({ error: "Both start_time and end_time must be provided together." });
      }

      const slotType = slot.slot_type || "lesson";
      if (slotType !== "lesson" && slotType !== "break") {
        return res.status(400).json({ error: "slot_type must be 'lesson' or 'break'." });
      }
      if (slotType === "break" && slot.teacher_id) {
        return res.status(400).json({ error: "Break slots cannot have a teacher assigned." });
      }
      if (slotType === "break" && !slot.label && !slot.subject) {
        return res.status(400).json({ error: "Break slots require a label (e.g. Lunch Break)." });
      }
    }

    const teacherIds = Array.from(new Set(slots.map((slot) => slot.teacher_id).filter(Boolean)));
    if (teacherIds.length > 0) {
      const { data: teacherConflicts, error: teacherConflictsError } = await supabase
        .from("timetable_slots")
        .select(`
          id,
          teacher_id,
          day_of_week,
          period_number,
          timetable_id,
          timetables:timetable_id (academic_year, term, grade, stream)
        `)
        .in("teacher_id", teacherIds);

      if (teacherConflictsError) throw teacherConflictsError;

      const conflicts = (teacherConflicts || []).filter((existing) => {
        const t = existing.timetables;
        if (!t) return false;
        if (existing.timetable_id === timetableId) return false;
        if (t.academic_year !== timetableMeta.academic_year) return false;
        if (t.term !== timetableMeta.term) return false;
        return slots.some(
          (incoming) =>
            incoming.teacher_id &&
            incoming.teacher_id === existing.teacher_id &&
            incoming.day_of_week === existing.day_of_week &&
            incoming.period_number === existing.period_number
        );
      });

      if (conflicts.length > 0) {
        const first = conflicts[0];
        const t = first.timetables;
        return res.status(409).json({
          error: `Teacher conflict: already assigned on day ${first.day_of_week}, period ${first.period_number} (${t.grade}${t.stream ? ` ${t.stream}` : ""}).`,
        });
      }
    }

    // Delete existing slots (safe after validation)
    const { error: deleteError } = await supabase
      .from("timetable_slots")
      .delete()
      .eq("timetable_id", timetableId);

    if (deleteError) throw deleteError;

    // Insert new slots
    if (slots.length > 0) {
      const slotsToInsert = slots.map((slot) => ({
        timetable_id: timetableId,
        day_of_week: slot.day_of_week,
        period_number: slot.period_number,
        subject: slot.subject || (slot.slot_type === "break" ? "Break" : null),
        teacher_id: slot.teacher_id || null,
        room: slot.room || null,
        start_time: slot.start_time || null,
        end_time: slot.end_time || null,
        slot_type: slot.slot_type || "lesson",
        label: slot.label || null,
      }));

      const { error: insertError } = await supabase
        .from("timetable_slots")
        .insert(slotsToInsert);

      if (insertError) throw insertError;
    }

    // Update timetable timestamp
    await supabase
      .from("timetables")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", timetableId);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to update timetable slots." });
  }
});

// Delete a timetable
app.delete("/api/timetables/:timetableId", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    // Check admin role
    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) throw roleError;
    if (!role) {
      return res.status(403).json({ error: "Admin access required." });
    }

    const { timetableId } = req.params;

    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", timetableId);

    if (error) throw error;

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to delete timetable." });
  }
});

// Get all teachers including admins with teacher role, scoped to current user's school
app.get("/api/teachers", async (req, res) => {
  try {
    const { user, error: authError } = await getAuthorizedUser(req);
    if (authError || !user) {
      return res.status(401).json({ error: authError || "Unauthorized." });
    }

    // Get the current user's school ID using the same logic as useSchoolScope
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    let schoolId = profile?.school_id || null;

    // If no profile school_id, check multiple sources
    if (!schoolId) {
      const [{ data: adminSchool }, { data: teacher }] = await Promise.all([
        supabase
          .from("schools")
          .select("id")
          .eq("admin_user_id", user.id)
          .maybeSingle(),
        supabase
          .from("teachers")
          .select("school_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      schoolId = adminSchool?.id || teacher?.school_id || null;
    }

    if (!schoolId) {
      return res.json({ teachers: [] });
    }

    console.log("[API /api/teachers] School ID:", schoolId);

    // Get all teacher user IDs from the teachers table for this school
    const { data: schoolTeachers, error: teachersError } = await supabase
      .from("teachers")
      .select("user_id")
      .eq("school_id", schoolId);

    if (teachersError) throw teachersError;
    const teacherUserIds = (schoolTeachers || []).map((t) => t.user_id);
    console.log("[API /api/teachers] Teacher user IDs from teachers table:", teacherUserIds);

    // Get admin user IDs from the schools table for this school
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("admin_user_id")
      .eq("id", schoolId)
      .maybeSingle();

    if (schoolError) throw schoolError;
    const adminUserId = schoolData?.admin_user_id;
    const adminUserIds = adminUserId ? [adminUserId] : [];
    console.log("[API /api/teachers] Admin user ID from schools table:", adminUserId);

    // Combine and deduplicate
    const allUserIds = [...new Set([...teacherUserIds, ...adminUserIds])];
    console.log("[API /api/teachers] All user IDs:", allUserIds);

    if (allUserIds.length === 0) {
      return res.json({ teachers: [] });
    }

    // Get profile info for these users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone")
      .in("user_id", allUserIds)
      .order("full_name");

    if (profilesError) throw profilesError;

    // Get teacher records if they exist
    const { data: teacherRecords, error: teacherError } = await supabase
      .from("teachers")
      .select("id, user_id")
      .in("user_id", allUserIds);

    if (teacherError) throw teacherError;
    const teacherRecordMap = new Map(
      (teacherRecords || []).map((t) => [t.user_id, t.id])
    );

    // Transform to Teacher interface
    const teachers = (profiles || []).map((profile) => ({
      id: teacherRecordMap.get(profile.user_id) || `user_${profile.user_id}`,
      user_id: profile.user_id,
      full_name: profile.full_name || "",
      email: profile.email,
      phone: profile.phone,
      created_at: new Date().toISOString(),
    }));

    console.log("[API /api/teachers] Returning teachers:", teachers.length);
    return res.json({ teachers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to load teachers." });
  }
});


// ============ DEBUG ENDPOINTS ============
import registerDebugTeachersEndpoint from "./debug-teachers.js";
registerDebugTeachersEndpoint(app);

// ============ END TIMETABLE API ENDPOINTS ============

const port = SERVER_PORT ? Number(SERVER_PORT) : 3001;
app.listen(port, () => {
  console.log(`Notice mailer listening on ${port}`);
});
