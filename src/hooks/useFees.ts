import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Fee = Tables<"fees">;
export type FeeInsert = TablesInsert<"fees">;
export type FeeUpdate = TablesUpdate<"fees">;

export const FEE_TYPES = [
  "Tuition",
  "Lunch Program",
  "Transport",
  "Uniform",
  "Books & Materials",
  "Activity Fee",
  "Exam Fee",
];

export function useFees() {
  return useQuery({
    queryKey: ["fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select(`
          *,
          student:students(id, full_name, admission_number, class:classes(grade, stream))
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useStudentFees(studentId?: string) {
  return useQuery({
    queryKey: ["student-fees", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from("fees")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export function useFeeSummary() {
  return useQuery({
    queryKey: ["fee-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("amount, paid_amount, status");

      if (error) throw error;

      const totalExpected = data.reduce((sum, f) => sum + Number(f.amount), 0);
      const totalCollected = data.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0);
      const totalBalance = totalExpected - totalCollected;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      return { totalExpected, totalCollected, totalBalance, collectionRate };
    },
  });
}

export function useCreateFee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fee: FeeInsert) => {
      const { data, error } = await supabase
        .from("fees")
        .insert(fee)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
      toast.success("Fee record created successfully!");
    },
    onError: (error) => {
      console.error("Error creating fee:", error);
      toast.error("Failed to create fee record");
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      feeId, 
      amount, 
      paymentMethod, 
      paymentReference 
    }: { 
      feeId: string; 
      amount: number; 
      paymentMethod: string; 
      paymentReference: string;
    }) => {
      // Get current fee record
      const { data: currentFee, error: fetchError } = await supabase
        .from("fees")
        .select("amount, paid_amount")
        .eq("id", feeId)
        .single();

      if (fetchError) throw fetchError;

      const newPaidAmount = Number(currentFee.paid_amount || 0) + amount;
      const newStatus = newPaidAmount >= Number(currentFee.amount) ? "paid" : "partial";

      const { data, error } = await supabase
        .from("fees")
        .update({
          paid_amount: newPaidAmount,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_date: new Date().toISOString().split("T")[0],
          status: newStatus,
        })
        .eq("id", feeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
      queryClient.invalidateQueries({ queryKey: ["student-fees"] });
      toast.success("Payment recorded successfully!");
    },
    onError: (error) => {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    },
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: FeeInsert) => {
      const { data, error } = await supabase
        .from("fees")
        .insert(invoice)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
      toast.success("Invoice created successfully!");
    },
    onError: (error) => {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    },
  });
}

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount);
