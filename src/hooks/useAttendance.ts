import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Attendance = Tables<"attendance">;
export type AttendanceInsert = TablesInsert<"attendance">;

export function useAttendance(classId?: string, date?: string) {
  return useQuery({
    queryKey: ["attendance", classId, date],
    queryFn: async () => {
      if (!classId || !date) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          student:students(id, full_name, admission_number)
        `)
        .eq("class_id", classId)
        .eq("date", date);

      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!date,
  });
}

export function useStudentAttendanceHistory(studentId?: string) {
  return useQuery({
    queryKey: ["attendance-history", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .order("date", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: AttendanceInsert[]) => {
      // First, delete existing records for this class and date
      if (records.length > 0) {
        const { class_id, date } = records[0];
        await supabase
          .from("attendance")
          .delete()
          .eq("class_id", class_id)
          .eq("date", date);
      }

      // Then insert new records
      const { data, error } = await supabase
        .from("attendance")
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved successfully!");
    },
    onError: (error) => {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    },
  });
}
