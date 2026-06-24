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
});

