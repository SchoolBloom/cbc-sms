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

export function useCreateGradeInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      grade,
      fee_type,
      amount,
      term,
      academic_year,
      due_date,
    }: {
      grade: string;
      fee_type: string;
      amount: number;
      term: number;
      academic_year: string;
      due_date: string;
    }) => {
      const fetchClassIds = async (filters: {
        grade: string;
        academic_year?: string;
        term?: number;
      }) => {
        let query = supabase.from("classes").select("id").eq("grade", filters.grade);
        if (filters.academic_year) {
          query = query.eq("academic_year", filters.academic_year);
        }
        if (filters.term !== undefined) {
          query = query.eq("term", filters.term);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((cls) => cls.id);
      };

      let classIds = await fetchClassIds({ grade, academic_year, term });
      if (classIds.length === 0) {
        classIds = await fetchClassIds({ grade, academic_year });
      }
      if (classIds.length === 0) {
        classIds = await fetchClassIds({ grade });
      }

      if (classIds.length === 0) {
        return { createdCount: 0 };
      }

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .in("class_id", classIds)
        .eq("status", "active");

      if (studentsError) throw studentsError;

      const studentIds = (students || []).map((student) => student.id);
      if (studentIds.length === 0) {
        return { createdCount: 0 };
      }

      const { data: existingFees, error: existingFeesError } = await supabase
        .from("fees")
        .select("student_id")
        .in("student_id", studentIds)
        .eq("term", term)
        .eq("academic_year", academic_year)
        .eq("fee_type", fee_type);

      if (existingFeesError) throw existingFeesError;

      const existingStudentIds = new Set((existingFees || []).map((fee) => fee.student_id));
      const missingStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

      if (missingStudentIds.length === 0) {
        return { createdCount: 0 };
      }

      const feesToInsert = missingStudentIds.map((studentId) => ({
        student_id: studentId,
        amount,
        fee_type,
        term,
        academic_year,
        due_date,
        status: "pending",
        paid_amount: 0,
      }));

      const { error: insertError } = await supabase
        .from("fees")
        .insert(feesToInsert);

      if (insertError) throw insertError;

      return { createdCount: feesToInsert.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      queryClient.invalidateQueries({ queryKey: ["fee-summary"] });
      toast.success("Invoices created successfully!");
      if (result?.createdCount && result.createdCount > 0) {
        toast.success(`Created ${result.createdCount} invoices`);
      }
    },
    onError: (error) => {
      console.error("Error creating invoices:", error);
      toast.error("Failed to create invoices");
    },
  });
}

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount);
