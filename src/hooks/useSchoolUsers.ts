import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export function useBursars() {
  return useQuery({
    queryKey: ["bursars"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "bursar");

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, created_at")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const bursars = roleData.map(role => {
        const profile = profileData?.find(p => p.user_id === role.user_id);
        return {
          id: profile?.id || role.user_id,
          user_id: role.user_id,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || null,
          phone: profile?.phone || null,
          created_at: profile?.created_at || role.created_at,
        };
      }) as SchoolUser[];

      return bursars.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}

export function useLibrarians() {
  return useQuery({
    queryKey: ["librarians"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "librarian");

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) return [];

      const userIds = roleData.map(r => r.user_id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, phone, created_at")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const librarians = roleData.map(role => {
        const profile = profileData?.find(p => p.user_id === role.user_id);
        return {
          id: profile?.id || role.user_id,
          user_id: role.user_id,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || null,
          phone: profile?.phone || null,
          created_at: profile?.created_at || role.created_at,
        };
      }) as SchoolUser[];

      return librarians.sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });
}

export function useRemoveBursar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "bursar");

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bursars"] });
      toast.success("Bursar removed successfully");
    },
    onError: (error) => {
      console.error("Error removing bursar:", error);
      toast.error("Failed to remove bursar");
    },
  });
}

export function useRemoveLibrarian() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "librarian");

      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["librarians"] });
      toast.success("Librarian removed successfully");
    },
    onError: (error) => {
      console.error("Error removing librarian:", error);
      toast.error("Failed to remove librarian");
    },
  });
}
