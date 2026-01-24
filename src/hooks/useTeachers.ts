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
      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");

      if (rolesError) throw rolesError;

      const userIds = roleRows?.map((row) => row.user_id) || [];

      if (userIds.length === 0) {
        return [] as Teacher[];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, created_at")
        .in("user_id", userIds)
        .order("full_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.user_id, profile])
      );

      return userIds.map((user_id) => {
        const profile = profileMap.get(user_id);
        return {
          id: profile?.id || user_id,
          user_id,
          full_name: profile?.full_name || "Unknown Teacher",
          email: profile?.email || null,
          phone: profile?.phone || null,
          created_at: profile?.created_at || new Date().toISOString(),
        };
      });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
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
