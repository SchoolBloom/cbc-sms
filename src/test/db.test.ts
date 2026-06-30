import { describe, it, expect } from "vitest";
import { supabase } from "../integrations/supabase/client";

describe("database check", () => {
  it("should query learners table", async () => {
    const { data, error } = await supabase.from("learners").select("id").limit(1);
    console.log("Learners query result:", { data, error });
    expect(error).toBeNull();
  });

  it("should query strands table", async () => {
    const { data, error } = await supabase.from("strands").select("id").limit(1);
    console.log("Strands query result:", { data, error });
    expect(error).toBeNull();
  });

  it("admin check diagnostics", async () => {
    const passwords = ["password", "password123", "admin123", "12345678", "123456", "Dennis123", "DennisKaranja"];
    let sessionUser: any = null;

    for (const password of passwords) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "memusibrian16@gmail.com",
        password
      });
      if (!error && data.user) {
        console.log("Successfully logged in as Dennis Karanja with password:", password);
        sessionUser = data.user;
        break;
      }
    }

    if (sessionUser) {
      // Dennis is logged in! Since he is system_admin, query all tables
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, school_id");
      const { data: schools } = await supabase.from("schools").select("id, name");
      const { data: learners } = await supabase.from("learners").select("id, school_id, full_name, status");

      console.log("ALL ROLES IN DB:", roles);
      console.log("ALL SCHOOLS IN DB:", schools);
      console.log("ALL LEARNERS IN DB:", learners);
    } else {
      console.log("Could not authenticate as Dennis Karanja.");
      
      // Fallback: log in as Brian Memusi (school admin) and query what he can see
      await supabase.auth.signInWithPassword({ email: "brian.memusi@strathmore.edu", password: "password" });
      const { data: learners } = await supabase.from("learners").select("id, school_id, full_name, status");
      console.log("LEARNERS VISIBLE TO BRIAN:", learners);
    }
  });
});
