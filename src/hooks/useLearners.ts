import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Learner {
  id: string;
  admission_number: string;
  assessment_number?: string | null;
  birth_certificate_number?: string | null;
  upi_number?: string | null;
  full_name: string;
  date_of_birth: string;
  gender: string;
  grade?: string | null;
  class_id: string | null;
  parent_id: string | null;
  parent_id_secondary: string | null;
  pathway: string | null;
  senior_pathway?: string | null;
  previous_school?: string | null;
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
    email?: string | null;
  } | null;
  secondary_parent: {
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
  } | null;
}

export function useLearners() {
  return useQuery({
    queryKey: ["learners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select(`
          *,
          classes:class_id (id, grade, stream),
          parents:parent_id (id, full_name, phone),
          secondary_parent:parent_id_secondary (id, full_name, phone)
        `)
        .order("full_name");

      if (error) throw error;
      return data as Learner[];
    },
  });
}

export function useUpdateLearnerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      learnerIds,
      status,
      clearClass,
    }: {
      learnerIds: string[];
      status: string;
      clearClass?: boolean;
    }) => {
      if (learnerIds.length === 0) return;

      const updates: Record<string, string | null> = { status };
      if (clearClass) updates.class_id = null;

      const { error } = await supabase.from("learners").update(updates).in("id", learnerIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success("Learner records updated");
    },
    onError: (error) => {
      console.error("Error updating learners:", error);
      toast.error("Failed to update learners");
    },
  });
}

export function useLearner(id: string) {
  return useQuery({
    queryKey: ["learners", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learners")
        .select(`
          *,
          classes:class_id (id, grade, stream),
          parents:parent_id (id, full_name, phone, email),
          secondary_parent:parent_id_secondary (id, full_name, phone, email)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Learner | null;
    },
    enabled: !!id,
  });
}

export function useUpdateLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: {
        admission_number?: string;
        assessment_number?: string | null;
        birth_certificate_number?: string | null;
        upi_number?: string | null;
        full_name?: string;
        date_of_birth?: string;
        gender?: string;
        grade?: string | null;
        class_id?: string | null;
        parent_id?: string | null;
        parent_id_secondary?: string | null;
        pathway?: string | null;
        medical_notes?: string | null;
        status?: string;
      };
    }) => {
      const { error } = await supabase.from("learners").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success("Learner updated successfully");
    },
    onError: (error) => {
      console.error("Error updating learner:", error);
      toast.error("Failed to update learner");
    },
  });
}

export function useDeleteLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (learnerId: string) => {
      const { error } = await supabase.from("learners").delete().eq("id", learnerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      toast.success("Learner deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting learner:", error);
      toast.error("Failed to delete learner");
    },
  });
}
