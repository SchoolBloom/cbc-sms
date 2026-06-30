import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformStats {
  totalSchools: number;
  totalLearners: number;
  totalUsers: number;
  schoolsByCategory: { category: string; count: number }[];
  accountsByRole: { role: string; count: number }[];
}

interface PlatformStatsRaw {
  total_schools: number;
  total_learners: number;
  total_users: number;
  schools_by_category: { category: string; count: number }[];
  accounts_by_role: { role: string; count: number }[];
}

export function usePlatformStats(enabled = true) {
  return useQuery<PlatformStats>({
    queryKey: ["platform-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_stats");
      if (error) throw error;

      const rawStats = data as unknown as PlatformStatsRaw;

      const roleMap: Record<string, string> = {
        admin: "School Administrator",
        teacher: "Teacher",
        parent: "Parent",
        system_admin: "System Administrator",
      };

      const schoolsByCategory = (rawStats.schools_by_category || []).map((s) => ({
        category: s.category === "Special_Needs" ? "Special Needs" : s.category,
        count: s.count,
      }));

      const accountsByRole = (rawStats.accounts_by_role || []).map((r) => ({
        role: roleMap[r.role] || r.role,
        count: r.count,
      }));

      return {
        totalSchools: rawStats.total_schools || 0,
        totalLearners: rawStats.total_learners || 0,
        totalUsers: rawStats.total_users || 0,
        schoolsByCategory,
        accountsByRole,
      };
    },
    enabled,
  });
}

