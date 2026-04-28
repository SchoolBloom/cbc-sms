import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSchoolScope } from "@/hooks/useSchoolScope";

export interface Parent {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  occupation: string | null;
  national_id_number?: string | null;
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

export function useParentsWithChildren(
  classIds?: string[] | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["parents-with-children", classIds?.join(",") || "all"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      // First get all parents
      const { data: parents, error: parentsError } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");
      
      if (parentsError) throw parentsError;

      // Then get students with their class info
      let studentsQuery = supabase
        .from("students")
        .select(`
          id,
          full_name,
          admission_number,
          parent_id,
          parent_id_secondary,
          class_id,
          classes:class_id (grade, stream)
        `);

      if (Array.isArray(classIds)) {
        if (classIds.length === 0) {
          return [];
        }
        studentsQuery = studentsQuery.in("class_id", classIds);
      }
      const { data: students, error: studentsError } = await studentsQuery;
      
      if (studentsError) throw studentsError;

      // Map children to parents in one pass to avoid O(parents * students) work
      const childrenByParentId = new Map<
        string,
        {
          id: string;
          full_name: string;
          admission_number: string;
          classes: {
            grade: string;
            stream: string;
          } | null;
        }[]
      >();

      for (const student of students || []) {
        const child = {
          id: student.id,
          full_name: student.full_name,
          admission_number: student.admission_number,
          classes: student.classes,
        };
        if (student.parent_id) {
          const list = childrenByParentId.get(student.parent_id) || [];
          list.push(child);
          childrenByParentId.set(student.parent_id, list);
        }
        if (student.parent_id_secondary && student.parent_id_secondary !== student.parent_id) {
          const list = childrenByParentId.get(student.parent_id_secondary) || [];
          list.push(child);
          childrenByParentId.set(student.parent_id_secondary, list);
        }
      }

      const parentsWithChildren = parents.map((parent) => ({
        ...parent,
        children: childrenByParentId.get(parent.id) || [],
      }));

      if (Array.isArray(classIds)) {
        return parentsWithChildren.filter((parent) => parent.children && parent.children.length > 0) as Parent[];
      }

      return parentsWithChildren as Parent[];
    },
  });
}

export function useAssignParentRole() {
  const queryClient = useQueryClient();
  const { data: schoolScope } = useSchoolScope();

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

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          email: normalizedEmail,
          ...(schoolScope?.schoolId ? { school_id: schoolScope.schoolId } : {}),
        })
        .eq("user_id", profile.user_id);
      if (profileUpdateError) throw profileUpdateError;

      const { error: parentUpdateError } = await supabase
        .from("parents")
        .update({
          user_id: profile.user_id,
          email: normalizedEmail,
          ...(schoolScope?.schoolId ? { school_id: schoolScope.schoolId } : {}),
        })
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
      queryClient.invalidateQueries({ queryKey: ["current-school-scope"] });
      queryClient.invalidateQueries({ queryKey: ["school-profile"] });
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["parents-with-children"] });
      toast.success("Parent access granted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateParent() {
  const queryClient = useQueryClient();
  const { data: schoolScope } = useSchoolScope();

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      email,
      updates,
    }: {
      id: string;
      userId?: string | null;
      email?: string | null;
      updates: {
        full_name?: string;
        phone?: string;
        email?: string | null;
        address?: string | null;
        occupation?: string | null;
      };
    }) => {
      const { error } = await supabase.from("parents").update(updates).eq("id", id);
      if (error) throw error;

      const profileUpdates: {
        full_name?: string;
        phone?: string | null;
        email?: string | null;
      } = {};

      if (updates.full_name) profileUpdates.full_name = updates.full_name;
      if (updates.phone) profileUpdates.phone = updates.phone;
      if (updates.email !== undefined) profileUpdates.email = updates.email;

      if (Object.keys(profileUpdates).length === 0) return;

      if (userId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update(profileUpdates)
          .eq("user_id", userId);
        if (profileError) throw profileError;
        return;
      }

      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data: profile, error: profileLookupError } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        if (profileLookupError) throw profileLookupError;
        if (profile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdates)
            .eq("user_id", profile.user_id);
          if (profileError) throw profileError;

          const { error: parentUpdateError } = await supabase
            .from("parents")
            .update({
              user_id: profile.user_id,
              email: normalizedEmail,
              ...(schoolScope?.schoolId ? { school_id: schoolScope.schoolId } : {}),
            })
            .eq("id", id);
          if (parentUpdateError) throw parentUpdateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["parents-with-children"] });
      toast.success("Parent updated successfully");
    },
    onError: (error) => {
      console.error("Error updating parent:", error);
      toast.error("Failed to update parent");
    },
  });
}

export function useDeleteParent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parentId: string) => {
      const { error } = await supabase.from("parents").delete().eq("id", parentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      queryClient.invalidateQueries({ queryKey: ["parents-with-children"] });
      toast.success("Parent deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting parent:", error);
      toast.error("Failed to delete parent");
    },
  });
}
