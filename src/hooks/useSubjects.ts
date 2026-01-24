import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Subject {
  id: string;
  name: string;
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
          classes (grade, stream)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const teacherIds = Array.from(
        new Set((data || []).map((row) => row.teacher_id).filter(Boolean))
      ) as string[];

      let teacherMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (teacherIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", teacherIds);

        if (profileError) throw profileError;
        teacherMap = new Map(
          (profiles || []).map((profile) => [
            profile.user_id,
            { full_name: profile.full_name || null, email: profile.email || null },
          ])
        );
      }

      return (data || []).map((row) => ({
        id: row.id,
        subject_id: row.subject_id,
        class_id: row.class_id,
        teacher_id: row.teacher_id,
        subject: row.subjects ?? null,
        class: row.classes ?? null,
        teacher: row.teacher_id ? teacherMap.get(row.teacher_id) ?? null : null,
      })) as SubjectAssignment[];
    },
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, code }: { name: string; code?: string }) => {
      const { error } = await supabase.from("subjects").insert({
        name: name.trim(),
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
      const { error } = await supabase
        .from("subject_assignments")
        .insert({
          subject_id: subjectId,
          class_id: classId,
          teacher_id: teacherId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-assignments"] });
      toast.success("Assignment saved");
    },
    onError: (error) => {
      console.error("Error assigning subject:", error);
      toast.error("Failed to assign subject");
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
