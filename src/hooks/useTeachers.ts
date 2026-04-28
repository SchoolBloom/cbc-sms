import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Teacher {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${apiUrl}/api/teachers`, {
        headers: {
          Authorization: `Bearer ${data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch teachers");
      }

      const result = await response.json();
      return result.teachers || [];
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: {
        full_name?: string;
        email?: string | null;
        phone?: string | null;
      };
    }) => {
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
      if (error) throw error;

      if (updates.full_name) {
        const { error: teacherError } = await supabase
          .from("teachers")
          .upsert(
            {
              user_id: userId,
              full_name: updates.full_name,
              email: updates.email ?? null,
              phone: updates.phone ?? null,
            },
            { onConflict: "user_id" }
          );
        if (teacherError) throw teacherError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher updated successfully");
    },
    onError: (error) => {
      console.error("Error updating teacher:", error);
      toast.error("Failed to update teacher");
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: teacherError } = await supabase
        .from("teachers")
        .delete()
        .eq("user_id", userId);
      if (teacherError) throw teacherError;

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "teacher");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher removed successfully");
    },
    onError: (error) => {
      console.error("Error removing teacher:", error);
      toast.error("Failed to remove teacher");
    },
  });
}

export function useTransferTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: classError } = await supabase
        .from("classes")
        .update({ teacher_id: null })
        .eq("teacher_id", userId);

      if (classError) throw classError;

      const { error: teacherError } = await supabase
        .from("teachers")
        .delete()
        .eq("user_id", userId);
      if (teacherError) throw teacherError;

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "teacher");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Teacher transferred successfully");
    },
    onError: (error) => {
      console.error("Error transferring teacher:", error);
      toast.error("Failed to transfer teacher");
    },
  });
}
