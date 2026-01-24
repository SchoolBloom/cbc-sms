import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Parent {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  occupation: string | null;
  created_at: string;
  children?: {
    id: string;
    full_name: string;
    admission_number: string;
    classes: {
      grade: string;
      stream: string;
    } | null;
  }[];
}

export function useParents() {
  return useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");
      
      if (error) throw error;
      return data as Parent[];
    },
  });
}

export function useParentsWithChildren() {
  return useQuery({
    queryKey: ["parents-with-children"],
    queryFn: async () => {
      // First get all parents
      const { data: parents, error: parentsError } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");
      
      if (parentsError) throw parentsError;

      // Then get students with their class info
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          admission_number,
          parent_id,
          classes:class_id (grade, stream)
        `);
      
      if (studentsError) throw studentsError;

      // Map children to parents
      const parentsWithChildren = parents.map((parent) => ({
        ...parent,
        children: students.filter((s) => s.parent_id === parent.id).map((s) => ({
          id: s.id,
          full_name: s.full_name,
          admission_number: s.admission_number,
          classes: s.classes,
        })),
      }));

      return parentsWithChildren as Parent[];
    },
  });
}

export function useAssignParentRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ parentId, email }: { parentId: string; email: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw new Error("Parent email is required to assign access.");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, email")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error("No user found for that email. Ask the parent to sign up first.");
      }

      const { error: parentUpdateError } = await supabase
        .from("parents")
        .update({ user_id: profile.user_id, email: normalizedEmail })
        .eq("id", parentId);

      if (parentUpdateError) throw parentUpdateError;

      const { data: existingRole, error: roleCheckError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", "parent")
        .maybeSingle();

      if (roleCheckError) throw roleCheckError;

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: profile.user_id, role: "parent" });
        if (roleError) throw roleError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["parents-with-children"] });
      toast.success("Parent access granted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
