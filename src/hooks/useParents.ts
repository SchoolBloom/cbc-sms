import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
