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
        .insert({
          user_id: createdAdminUserId,
          role: "admin",
        });

      if (roleError) throw roleError;

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

const port = SERVER_PORT ? Number(SERVER_PORT) : 3001;
app.listen(port, () => {
  console.log(`Notice mailer listening on ${port}`);
});
