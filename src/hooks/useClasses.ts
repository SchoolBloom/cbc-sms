import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Class {
  id: string;
  grade: string;
  stream: string;
  teacher_id: string | null;
  academic_year: string;
  term: number;
  created_at: string;
  student_count?: number;
}

export function useClasses() {
  return useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("grade")
        .order("stream");
      
      if (error) throw error;
      return data as Class[];
    },
  });
}

export function useClassesWithStudentCount() {
  return useQuery({
    queryKey: ["classes-with-count"],
    queryFn: async () => {
      // Get classes
      const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .order("grade")
        .order("stream");
      
      if (classesError) throw classesError;

      // Get student counts
      const { data: students, error: studentsError } = await supabase
        .from("learners")
        .select("class_id")
        .eq("status", "active");
      
      if (studentsError) throw studentsError;

      // Count students per class
      const counts = students.reduce((acc, s) => {
        if (s.class_id) {
          acc[s.class_id] = (acc[s.class_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return classes.map((cls) => ({
        ...cls,
        student_count: counts[cls.id] || 0,
      })) as Class[];
    },
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { grade: string; stream: string; academic_year?: string }) => {
      const { error } = await supabase.from("classes").insert({
        grade: data.grade,
        stream: data.stream,
        academic_year: data.academic_year || "2025",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Class created successfully");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAssignClassTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      classId,
      teacherId,
    }: {
      classId: string;
      teacherId: string | null;
    }) => {
      const { error } = await supabase
        .from("classes")
        .update({ teacher_id: teacherId })
        .eq("id", classId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["classes-with-count"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-class-assignments"] });
      toast.success("Class teacher updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
