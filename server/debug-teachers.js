// Debug endpoint for teachers and admin visibility
import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: new URL("./.env.server", import.meta.url).pathname });

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env vars: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export default function registerDebugTeachersEndpoint(app) {
  app.get("/api/debug/teachers", async (req, res) => {
    try {
      const { user, error: authError } = req;
      if (authError || !user) {
        return res.status(401).json({ error: authError || "Unauthorized." });
      }

      // Get the current user's school ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();
      let schoolId = profile?.school_id || null;

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

      // Get all teacher user IDs from the teachers table for this school
      const { data: schoolTeachers } = await supabase
        .from("teachers")
        .select("user_id")
        .eq("school_id", schoolId);
      const teacherUserIds = (schoolTeachers || []).map((t) => t.user_id);

      // Get admin user IDs from the schools table for this school
      const { data: schoolData } = await supabase
        .from("schools")
        .select("admin_user_id")
        .eq("id", schoolId)
        .maybeSingle();
      const adminUserId = schoolData?.admin_user_id;
      const adminUserIds = adminUserId ? [adminUserId] : [];

      // Combine and deduplicate
      const allUserIds = [...new Set([...teacherUserIds, ...adminUserIds])];

      // Get profile info for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", allUserIds)
        .order("full_name");

      res.json({
        schoolId,
        teacherUserIds,
        adminUserIds,
        allUserIds,
        profiles,
      });
    } catch (err) {
      res.status(500).json({ error: err?.message || "Failed to debug teachers." });
    }
  });
}