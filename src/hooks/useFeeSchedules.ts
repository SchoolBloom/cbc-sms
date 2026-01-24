import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FeeSchedule {
  id: string;
  grade: string;
  term: number;
  academic_year: string;
  amount: number;
  fee_type: string;
  due_date: string;
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
    mutationFn: async (schedule: {
      grade: string;
      term: number;
      academic_year: string;
      amount: number;
      fee_type: string;
      due_date: string;
    }) => {
      const { error } = await supabase
        .from("fee_schedules")
        .upsert(
          {
            grade: schedule.grade,
            term: schedule.term,
            academic_year: schedule.academic_year,
            amount: schedule.amount,
            fee_type: schedule.fee_type,
            due_date: schedule.due_date,
          },
          { onConflict: "grade,term,academic_year" }
        );

      if (error) throw error;
      const fetchClassIds = async (filters: {
        grade: string;
        academic_year?: string;
        term?: number;
      }) => {
        let query = supabase.from("classes").select("id").eq("grade", filters.grade);
        if (filters.academic_year) {
          query = query.eq("academic_year", filters.academic_year);
        }
        if (filters.term !== undefined) {
          query = query.eq("term", filters.term);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((cls) => cls.id);
      };

      let classIds = await fetchClassIds({
        grade: schedule.grade,
        academic_year: schedule.academic_year,
        term: schedule.term,
      });
      if (classIds.length === 0) {
        classIds = await fetchClassIds({ grade: schedule.grade, academic_year: schedule.academic_year });
      }
      if (classIds.length === 0) {
        classIds = await fetchClassIds({ grade: schedule.grade });
      }

      if (classIds.length === 0) {
        return { createdCount: 0 };
      }

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .in("class_id", classIds)
        .eq("status", "active");

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map((student) => student.id);
      if (studentIds.length === 0) {
        return { createdCount: 0 };
      }

      const { data: existingFees, error: existingFeesError } = await supabase
        .from("fees")
        .select("student_id")
        .in("student_id", studentIds)
        .eq("term", schedule.term)
        .eq("academic_year", schedule.academic_year)
        .eq("fee_type", schedule.fee_type);

      if (existingFeesError) throw existingFeesError;

      const existingStudentIds = new Set((existingFees || []).map((fee) => fee.student_id));
      const missingStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

      if (missingStudentIds.length === 0) {
        return { createdCount: 0 };
      }

      const feesToInsert = missingStudentIds.map((studentId) => ({
        student_id: studentId,
        amount: schedule.amount,
        fee_type: schedule.fee_type,
        term: schedule.term,
        academic_year: schedule.academic_year,
        due_date: schedule.due_date,
        status: "pending",
        paid_amount: 0,
      }));

      const { error: insertError } = await supabase
        .from("fees")
        .insert(feesToInsert);

      if (insertError) throw insertError;

      return { createdCount: feesToInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fee-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
      toast.success("Fee schedule saved");
      if (result?.createdCount) {
        toast.success(`Created ${result.createdCount} invoices`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
