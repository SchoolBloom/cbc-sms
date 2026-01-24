import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  current_term: number;
  term1_start: string | null;
  term1_end: string | null;
  term2_start: string | null;
  term2_end: string | null;
  term3_start: string | null;
  term3_end: string | null;
  is_current: boolean;
}

export function useAcademicYear() {
  return useQuery({
    queryKey: ["academic-year"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .order("is_current", { ascending: false })
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as AcademicYear | null;
    },
  });
}

export function useUpsertAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AcademicYear) => {
      const { error } = await supabase
        .from("academic_years")
        .upsert(
          {
            id: payload.id || undefined,
            label: payload.label,
            start_date: payload.start_date,
            end_date: payload.end_date,
            current_term: payload.current_term,
            term1_start: payload.term1_start || null,
            term1_end: payload.term1_end || null,
            term2_start: payload.term2_start || null,
            term2_end: payload.term2_end || null,
            term3_start: payload.term3_start || null,
            term3_end: payload.term3_end || null,
            is_current: payload.is_current,
          },
          { onConflict: "label" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-year"] });
      toast.success("Academic year saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
