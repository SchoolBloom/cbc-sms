import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAllowedGrades, getGradeBandLabel, type SchoolCategory } from "@/lib/schoolCategories";

export function useSchoolScope() {
  const schoolQuery = useQuery({
    queryKey: ["current-school-scope"],
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        return { schoolId: null, categories: ["primary_junior_secondary"] as SchoolCategory[] };
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("school_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      let resolvedSchoolId = profile?.school_id || null;

      if (!resolvedSchoolId) {
        const [
          { data: adminRole },
          { data: adminSchool },
          { data: teacherByUserId },
          { data: teacherByEmail },
          { data: parentByUserId },
          { data: parentByEmail },
        ] = await Promise.all([
          supabase
            .from("user_roles")
            .select("school_id")
            .eq("user_id", user.id)
            .eq("role", "admin")
            .not("school_id", "is", null)
            .maybeSingle(),
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
          user.email
            ? supabase
                .from("teachers")
                .select("school_id")
                .ilike("email", user.email)
                .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("parents")
            .select("school_id")
            .eq("user_id", user.id)
            .maybeSingle(),
          user.email
            ? supabase
                .from("parents")
                .select("school_id")
                .ilike("email", user.email)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        resolvedSchoolId =
          adminRole?.school_id ||
          adminSchool?.id ||
          teacherByUserId?.school_id ||
          teacherByEmail?.school_id ||
          parentByUserId?.school_id ||
          parentByEmail?.school_id ||
          null;
      }

      if (!resolvedSchoolId) {
        return { schoolId: null, categories: ["primary_junior_secondary"] as SchoolCategory[] };
      }

      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, school_categories")
        .eq("id", resolvedSchoolId)
        .maybeSingle();

      if (schoolError) throw schoolError;

      return {
        schoolId: school?.id || resolvedSchoolId,
        schoolName: school?.name || null,
        categories: (school?.school_categories || ["primary_junior_secondary"]) as SchoolCategory[],
      };
    },
  });

  const categories = schoolQuery.data?.categories || ["primary_junior_secondary"];
  const allowedGrades = useMemo(() => getAllowedGrades(categories), [categories]);
  const gradeBandLabel = useMemo(() => getGradeBandLabel(categories), [categories]);

  return {
    ...schoolQuery,
    schoolId: schoolQuery.data?.schoolId || null,
    schoolName: schoolQuery.data?.schoolName || null,
    categories,
    allowedGrades,
    gradeBandLabel,
    supportsPrimaryJunior: categories.includes("primary_junior_secondary"),
    supportsSenior: categories.includes("senior_secondary"),
  };
}
