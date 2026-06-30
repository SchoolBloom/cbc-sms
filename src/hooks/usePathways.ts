import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PathwayPreference {
  id: string;
  learner_id: string;
  rank: number;
  pathway: 'STEM' | 'Social_Sciences' | 'Arts_Sports';
  academic_year: string;
  recorded_by: string | null;
  preferred_school_name: string | null;
  is_locked: boolean;
}

export interface PathwayAllocation {
  id: string;
  learner_id: string;
  pathway: 'STEM' | 'Social_Sciences' | 'Arts_Sports';
  academic_year: string;
  kjsea_score: number | null;
  allocation_source: 'KJSEA' | 'manual' | 'appeal';
  finalized: boolean;
  finalized_at: string | null;
  finalized_by: string | null;
  notes: string | null;
  allocated_school_name: string | null;
  allocated_school_code: string | null;
}

export function usePathwayPreferences(learnerId?: string) {
  return useQuery({
    queryKey: ["pathway-preferences", learnerId],
    queryFn: async () => {
      if (!learnerId) return [];
      const { data, error } = await supabase
        .from("pathway_preferences")
        .select("*")
        .eq("learner_id", learnerId)
        .order("rank");

      if (error) throw error;
      return data as PathwayPreference[];
    },
    enabled: !!learnerId,
  });
}

export function usePathwayAllocation(learnerId?: string) {
  return useQuery({
    queryKey: ["pathway-allocation", learnerId],
    queryFn: async () => {
      if (!learnerId) return null;
      const { data, error } = await supabase
        .from("pathway_allocations")
        .select("*")
        .eq("learner_id", learnerId)
        .maybeSingle();

      if (error) throw error;
      return data as PathwayAllocation | null;
    },
    enabled: !!learnerId,
  });
}

export function useSavePathwayPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      academicYear,
      preferences,
    }: {
      learnerId: string;
      academicYear: string;
      preferences: { rank: number; pathway: 'STEM' | 'Social_Sciences' | 'Arts_Sports'; preferred_school_name: string }[];
    }) => {
      // First delete existing preferences for this learner and year
      const { error: deleteError } = await supabase
        .from("pathway_preferences")
        .delete()
        .eq("learner_id", learnerId)
        .eq("academic_year", academicYear);

      if (deleteError) throw deleteError;

      // Insert new preferences
      if (preferences.length > 0) {
        const records = preferences.map((p) => ({
          learner_id: learnerId,
          rank: p.rank,
          pathway: p.pathway,
          academic_year: academicYear,
          preferred_school_name: p.preferred_school_name || null,
        }));

        const { error: insertError } = await supabase
          .from("pathway_preferences")
          .insert(records);

        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pathway-preferences", variables.learnerId] });
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success("Pathway preferences saved successfully");
    },
    onError: (error: Error) => {
      console.error("Error saving preferences:", error);
      toast.error(error.message || "Failed to save preferences");
    },
  });
}

export function useSavePathwayAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      academicYear,
      pathway,
      kjseaScore,
      allocationSource,
      notes,
      finalized,
      userId,
      allocatedSchoolName,
      allocatedSchoolCode,
    }: {
      learnerId: string;
      academicYear: string;
      pathway: 'STEM' | 'Social_Sciences' | 'Arts_Sports';
      kjseaScore: number | null;
      allocationSource: 'KJSEA' | 'manual' | 'appeal';
      notes: string | null;
      finalized: boolean;
      userId: string;
      allocatedSchoolName?: string | null;
      allocatedSchoolCode?: string | null;
    }) => {
      // Fetch existing allocation to see if we should insert or update
      const { data: existing } = await supabase
        .from("pathway_allocations")
        .select("id")
        .eq("learner_id", learnerId)
        .eq("academic_year", academicYear)
        .maybeSingle();

      const record: any = {
        learner_id: learnerId,
        academic_year: academicYear,
        pathway,
        kjsea_score: kjseaScore,
        allocation_source: allocationSource,
        notes,
        finalized,
        allocated_school_name: allocatedSchoolName || null,
        allocated_school_code: allocatedSchoolCode || null,
      };

      if (finalized) {
        record.finalized_by = userId;
      }

      if (existing) {
        const { error } = await supabase
          .from("pathway_allocations")
          .update(record)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("pathway_allocations")
          .insert(record);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pathway-allocation", variables.learnerId] });
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success(variables.finalized ? "Pathway allocation finalized and locked!" : "Pathway allocation draft saved");
    },
    onError: (error: Error) => {
      console.error("Error saving allocation:", error);
      toast.error(error.message || "Failed to save pathway allocation");
    },
  });
}

export function useSetPathwayPreferencesLock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerId,
      academicYear,
      isLocked,
    }: {
      learnerId: string;
      academicYear: string;
      isLocked: boolean;
    }) => {
      const { error } = await supabase.rpc("set_pathway_preferences_lock", {
        target_learner_id: learnerId,
        target_academic_year: academicYear,
        lock_state: isLocked,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pathway-preferences", variables.learnerId] });
      queryClient.invalidateQueries({ queryKey: ["all-pathway-preferences"] });
      toast.success(variables.isLocked ? "Preferences locked" : "Preferences unlocked");
    },
    onError: (error: Error) => {
      console.error("Error toggling preference lock:", error);
      toast.error(error.message || "Failed to change lock state");
    },
  });
}
