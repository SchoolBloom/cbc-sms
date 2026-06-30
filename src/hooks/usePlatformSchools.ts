import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolRecord {
  id: string;
  name: string;
  code: string;
  nemis_code: string | null;
  knec_code: string | null;
  levels_offered: string[] | null;
  active_status: boolean | null;
  status: string;
  county: string | null;
  subcounty: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  administrator_name: string | null;
  administrator_email: string | null;
  administrator_phone: string | null;
  admin_user_id: string | null;
  created_at: string;
}

export interface CreateSchoolInput {
  name: string;
  nemis_code: string;
  knec_code?: string;
  levels_offered: string[];
  county?: string;
  subcounty?: string;
  contact_email?: string;
  contact_phone?: string;
  administrator_name: string;
  administrator_email: string;
  administrator_phone?: string;
  category?: string;
}

export function usePlatformSchools() {
  return useQuery({
    queryKey: ["platform-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any as SchoolRecord[];
    },
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSchoolInput) => {
      const { data, error } = await supabase
        .from("schools")
        .insert({
          name: input.name,
          code: input.nemis_code,
          nemis_code: input.nemis_code,
          knec_code: input.knec_code || null,
          levels_offered: input.levels_offered,
          school_categories: input.levels_offered,
          county: input.county || null,
          subcounty: input.subcounty || null,
          contact_email: input.contact_email || null,
          contact_phone: input.contact_phone || null,
          administrator_name: input.administrator_name,
          administrator_email: input.administrator_email,
          administrator_phone: input.administrator_phone || null,
          status: "onboarding",
          active_status: false,
          category: input.category || "Public",
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-schools"] });
      toast.success("School registered successfully");
    },
    onError: (error: any) => {
      console.error("Error creating school:", error);
      toast.error(error.message || "Failed to register school");
    },
  });
}

export function useProvisionSchoolAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, adminEmail }: { schoolId: string; adminEmail: string }) => {
      const { data, error } = await (supabase as any).rpc("provision_school_administrator", {
        _school_id: schoolId,
        _admin_email: adminEmail,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-schools"] });
      toast.success("School administrator provisioned");
    },
    onError: (error: Error) => {
      console.error("Error provisioning admin:", error);
      toast.error(error.message || "Failed to provision administrator");
    },
  });
}

export function useToggleSchoolAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ schoolId, active }: { schoolId: string; active: boolean }) => {
      const { error } = await supabase
        .from("schools")
        .update({
          active_status: active,
          status: active ? "active" : "suspended",
        })
        .eq("id", schoolId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform-schools"] });
      toast.success(variables.active ? "School access activated" : "School access suspended");
    },
    onError: (error) => {
      console.error("Error updating school access:", error);
      toast.error("Failed to update school access");
    },
  });
}
