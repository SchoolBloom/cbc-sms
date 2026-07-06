import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSchoolScope } from "@/hooks/useSchoolScope";

export interface Subject {
  id: string;
  name: string;
  category: string;
  pathway: string | null;
  code: string | null;
  created_at: string;
}

export interface SubjectAssignment {
  id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string | null;
  subject: { name: string; code: string | null } | null;
  class: { grade: string; stream: string } | null;
  teacher: { full_name: string | null; email: string | null } | null;
}

export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Subject[];
    },
  });
}

export function useSubjectAssignments() {
  return useQuery({
    queryKey: ["subject-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_assignments")
        .select(
          `
          id,
          subject_id,
          class_id,
          teacher_id,
          subjects (name, code),
          classes (grade, stream),
          teachers (full_name, email)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        subject_id: row.subject_id,
        class_id: row.class_id,
        teacher_id: row.teacher_id,
        subject: row.subjects ?? null,
        class: row.classes ?? null,
        teacher: row.teachers ? { full_name: row.teachers.full_name, email: row.teachers.email } : null,
      })) as SubjectAssignment[];
    },
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      category,
      pathway = null,
      code = null,
    }: {
      name: string;
      category: string;
      pathway?: string | null;
      code?: string | null;
    }) => {
      const { error } = await supabase.from("subjects").insert({
        name: name.trim(),
        category,
        pathway,
        code: code?.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject added");
    },
    onError: (error) => {
      console.error("Error adding subject:", error);
      toast.error("Failed to add subject");
    },
  });
}

export function useCreateSubjectAssignment() {
  const queryClient = useQueryClient();
  const { schoolId } = useSchoolScope();

  return useMutation({
    mutationFn: async ({
      subjectId,
      classId,
      teacherId,
    }: {
      subjectId: string;
      classId: string;
      teacherId: string;
    }) => {
      if (!schoolId) {
        throw new Error("No school ID found. Please make sure you are logged in and linked to a school.");
      }

      const { error } = await supabase
        .from("subject_assignments")
        .insert({
          subject_id: subjectId,
          class_id: classId,
          teacher_id: teacherId,
          school_id: schoolId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-assignments"] });
      toast.success("Assignment saved");
    },
    onError: (error: Error) => {
      console.error("Error assigning subject:", error);
      toast.error(error.message || "Failed to assign subject");
    },
  });
}

export function useDeleteSubjectAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("subject_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-assignments"] });
      toast.success("Assignment removed");
    },
    onError: (error) => {
      console.error("Error removing assignment:", error);
      toast.error("Failed to remove assignment");
    },
  });
}
