import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  class_id: string | null;
  parent_id: string | null;
  medical_notes: string | null;
  status: string;
  photo_url: string | null;
  created_at: string;
  classes: {
    id: string;
    grade: string;
    stream: string;
  } | null;
  parents: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          classes:class_id (id, grade, stream),
          parents:parent_id (id, full_name, phone)
        `)
        .order("full_name");
      
      if (error) throw error;
      return data as Student[];
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          classes:class_id (id, grade, stream),
          parents:parent_id (id, full_name, phone, email)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Student | null;
    },
    enabled: !!id,
  });
}
