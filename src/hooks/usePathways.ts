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
  allocated_school_id: string | null;
}

// Extended allocation record with joined learner data for status views
export interface PathwayAllocationWithLearner extends PathwayAllocation {
  learner: {
    id: string;
    full_name: string;
    admission_number: string;
    school_id: string | null;
    upi_number: string | null;
    assessment_number: string | null;
    status: string;
    classes: { grade: string; stream: string } | null;
  } | null;
  // Resolved school names for display
  allocated_school: { id: string; name: string } | null;
  learner_current_school: { id: string; name: string } | null;
}

export type PathwayAdmissionStatus = 'Pending' | 'Admitted' | 'Transferred';

/**
 * Calculate the dynamic pathway admission status.
 * - Pending:     allocated_school_id matches SSS, but learner is still at origin school
 * - Admitted:    allocated_school_id matches SSS AND learner.school_id matches SSS
 * - Transferred: allocated_school_id matches SSS, but learner.school_id is a DIFFERENT school
 */
export function calculatePathwayStatus(
  allocatedSchoolId: string | null,
  learnerSchoolId: string | null,
  originSchoolId?: string | null
): PathwayAdmissionStatus {
  if (!allocatedSchoolId || !learnerSchoolId) return 'Pending';
  if (learnerSchoolId === allocatedSchoolId) return 'Admitted';
  // Learner is at a different school than the allocated one
  // If they're still at origin, they haven't moved yet → Pending
  // If they're at a third school → Transferred
  if (originSchoolId && learnerSchoolId === originSchoolId) return 'Pending';
  return 'Transferred';
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
      // allocated_school_id is resolved server-side by DB trigger (JSS admins cannot
      // read other schools via RLS, so client-side lookup would always fail).
      const trimmedCode = allocatedSchoolCode?.trim() || null;

      // Fetch existing allocation to see if we should insert or update
      const { data: existing } = await supabase
        .from("pathway_allocations")
        .select("id")
        .eq("learner_id", learnerId)
        .eq("academic_year", academicYear)
        .maybeSingle();

      const record: Record<string, unknown> = {
        learner_id: learnerId,
        academic_year: academicYear,
        pathway,
        kjsea_score: kjseaScore,
        allocation_source: allocationSource,
        notes,
        finalized,
        allocated_school_name: allocatedSchoolName?.trim() || null,
        allocated_school_code: trimmedCode,
      };

      if (finalized) {
        record.finalized_by = userId;
        if (!trimmedCode) {
          throw new Error(
            "KNEC School Code is required to finalize placement so the receiving senior secondary school can see the allocation."
          );
        }
      }

      let allocationId = existing?.id;

      if (existing) {
        const { error } = await supabase
          .from("pathway_allocations")
          .update(record)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("pathway_allocations")
          .insert(record)
          .select("id")
          .single();
        if (error) throw error;
        allocationId = inserted.id;
      }

      if (trimmedCode && allocationId) {
        const { data: saved } = await supabase
          .from("pathway_allocations")
          .select("allocated_school_id, allocated_school_name")
          .eq("id", allocationId)
          .single();

        if (!saved?.allocated_school_id) {
          throw new Error(
            `Could not match KNEC school code "${trimmedCode}" to a registered senior secondary school. ` +
              "Ask your platform administrator to confirm the destination school's KNEC code is set correctly."
          );
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pathway-allocation", variables.learnerId] });
      queryClient.invalidateQueries({ queryKey: ["all-pathway-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["pathway-allocations-for-school"] });
      queryClient.invalidateQueries({ queryKey: ["pathway-allocations-for-origin-school"] });
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

/**
 * Fetch pathway allocations where allocated_school_id matches the given school.
 * Used by SSS admins to see incoming learners and their dynamic status.
 * Joins learners to get current school_id for status calculation.
 */
export function usePathwayAllocationsForSchool(schoolId: string | null) {
  return useQuery({
    queryKey: ["pathway-allocations-for-school", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase.rpc("get_incoming_pathway_allocations", {
        p_school_id: schoolId,
      });

      if (error) throw error;

      const rows = (Array.isArray(data) ? data : []) as PathwayAllocationWithLearner[];
      return rows.map((alloc) => ({
        ...alloc,
        learner: alloc.learner
          ? {
              ...alloc.learner,
              classes: Array.isArray(alloc.learner.classes)
                ? alloc.learner.classes[0]
                : alloc.learner.classes,
            }
          : null,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetch pathway allocations originating from the given school (by school_id on the allocation row).
 * Used by JSS/Primary admins to see all outgoing allocations for their learners
 * with resolved allocated school and current learner school names.
 */
export function usePathwayAllocationsForOriginSchool(schoolId: string | null) {
  return useQuery({
    queryKey: ["pathway-allocations-for-origin-school", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];

      const { data, error } = await supabase
        .from("pathway_allocations")
        .select(`
          *,
          learner:learners!pathway_allocations_learner_id_fkey (
            id, full_name, admission_number, school_id,
            upi_number, assessment_number, status,
            classes:classes (grade, stream)
          ),
          allocated_school:schools!pathway_allocations_allocated_school_id_fkey (
            id, name
          )
        `)
        .eq("school_id", schoolId);

      if (error) throw error;

      const results: PathwayAllocationWithLearner[] = [];
      for (const alloc of (data || [])) {
        const learner = Array.isArray(alloc.learner) ? alloc.learner[0] : alloc.learner;
        const allocatedSchool = Array.isArray(alloc.allocated_school) ? alloc.allocated_school[0] : alloc.allocated_school;

        let learnerCurrentSchool: { id: string; name: string } | null = null;
        if (learner?.school_id) {
          if (learner.school_id === allocatedSchool?.id) {
            // Learner is at the allocated school
            learnerCurrentSchool = allocatedSchool;
          } else if (learner.school_id === schoolId) {
            // Learner is still at origin
            learnerCurrentSchool = null; // origin — will be treated as "still here"
          } else {
            // Learner is at a third school (transferred)
            const { data: schoolData } = await supabase
              .from("schools")
              .select("id, name")
              .eq("id", learner.school_id)
              .maybeSingle();
            learnerCurrentSchool = schoolData;
          }
        }

        results.push({
          ...alloc,
          learner: learner ? {
            ...learner,
            classes: Array.isArray(learner.classes) ? learner.classes[0] : learner.classes,
          } : null,
          allocated_school: allocatedSchool,
          learner_current_school: learnerCurrentSchool,
        });
      }

      return results;
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetch a single learner's allocation with resolved school names.
 * Used by the parent view to show dynamic status with school destinations.
 */
export function usePathwayAllocationWithSchools(learnerId?: string) {
  return useQuery({
    queryKey: ["pathway-allocation-with-schools", learnerId],
    queryFn: async () => {
      if (!learnerId) return null;

      const { data, error } = await supabase
        .from("pathway_allocations")
        .select(`
          *,
          allocated_school:schools!pathway_allocations_allocated_school_id_fkey (
            id, name
          )
        `)
        .eq("learner_id", learnerId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const allocatedSchool = Array.isArray(data.allocated_school)
        ? data.allocated_school[0]
        : data.allocated_school;

      return {
        ...data,
        allocated_school: allocatedSchool as { id: string; name: string } | null,
      };
    },
    enabled: !!learnerId,
  });
}
