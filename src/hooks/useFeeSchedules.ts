import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeeSchedule {
  id: string;
  grade: string;
  term: number;
  academic_year: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export function useFeeSchedules(enabled = true) {
  return useQuery({
    queryKey: ["fee-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_schedules")
        .select("*")
        .order("academic_year", { ascending: false })
        .order("term")
        .order("grade");
      if (error) throw error;
      return (data || []) as FeeSchedule[];
    },
    enabled,
  });
}

export function useUpsertFeeSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schedule: { grade: string; term: number; academic_year: string; amount: number }) => {
      const { error } = await supabase
        .from("fee_schedules")
        .upsert(
          {
            grade: schedule.grade,
            term: schedule.term,
            academic_year: schedule.academic_year,
            amount: schedule.amount,
          },
          { onConflict: "grade,term,academic_year" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-schedules"] });
      toast.success("Fee schedule saved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
