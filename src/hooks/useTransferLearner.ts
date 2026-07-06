import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TransferLearnerInput {
  targetSchoolId: string;
  identifierType: "UPI" | "KNEC";
  identifierValue: string;
  newAdmissionNumber: string;
  newClassId: string;
}

export interface TransferLearnerResult {
  success: boolean;
  learner_id: string;
  full_name: string;
  origin_school_name: string;
  target_school_name: string;
}

export function useTransferLearner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransferLearnerInput): Promise<TransferLearnerResult> => {
      const { data, error } = await supabase.rpc("admit_transfer_learner", {
        p_target_school_id: input.targetSchoolId,
        p_identifier_type: input.identifierType,
        p_identifier_value: input.identifierValue.trim(),
        p_new_admission_number: input.newAdmissionNumber.trim(),
        p_new_class_id: input.newClassId,
      });

      if (error) throw error;
      return data as TransferLearnerResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["learners"] });
      queryClient.invalidateQueries({ queryKey: ["all-pathway-allocations"] });
      queryClient.invalidateQueries({ queryKey: ["pathway-allocations-for-school"] });
      toast.success(
        `Successfully transferred ${data.full_name} from ${data.origin_school_name}`,
        { duration: 6000 }
      );
    },
    onError: (error: Error) => {
      console.error("Transfer learner error:", error);
      toast.error(error.message || "Failed to transfer learner");
    },
  });
}
