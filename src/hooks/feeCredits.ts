import { supabase } from "@/integrations/supabase/client";

type FeeCreditRow = {
  id: string;
  amount: number;
  paid_amount: number | null;
  status: string;
  payment_date: string | null;
  created_at: string;
};

const getFeeTimestamp = (fee: FeeCreditRow) => {
  const dateValue = fee.payment_date || fee.created_at;
  const parsed = Date.parse(dateValue);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export async function applyStudentCreditToInvoice(studentId: string, invoiceAmount: number) {
  if (!studentId || invoiceAmount <= 0) {
    return { appliedAmount: 0 };
  }

  const { data, error } = await supabase
    .from("fees")
    .select("id, amount, paid_amount, status, payment_date, created_at")
    .eq("student_id", studentId);

  if (error) throw error;

  const feeRows = (data || []) as FeeCreditRow[];
  const overpaidFees = feeRows
    .filter((fee) => Number(fee.paid_amount || 0) > Number(fee.amount))
    .sort((a, b) => getFeeTimestamp(a) - getFeeTimestamp(b));

  if (overpaidFees.length === 0) {
    return { appliedAmount: 0 };
  }

  const availableCredit = overpaidFees.reduce((sum, fee) => {
    return sum + (Number(fee.paid_amount || 0) - Number(fee.amount));
  }, 0);

  let remainingToApply = Math.min(availableCredit, invoiceAmount);
  if (remainingToApply <= 0) {
    return { appliedAmount: 0 };
  }

  for (const fee of overpaidFees) {
    if (remainingToApply <= 0) break;

    const paidAmount = Number(fee.paid_amount || 0);
    const excess = paidAmount - Number(fee.amount);
    if (excess <= 0) continue;

    const useAmount = Math.min(excess, remainingToApply);
    const newPaidAmount = paidAmount - useAmount;
    const newStatus = newPaidAmount >= Number(fee.amount) ? "paid" : "partial";

    const { error: updateError } = await supabase
      .from("fees")
      .update({ paid_amount: newPaidAmount, status: newStatus })
      .eq("id", fee.id);

    if (updateError) throw updateError;

    remainingToApply -= useAmount;
  }

  return { appliedAmount: Math.min(availableCredit, invoiceAmount) - remainingToApply };
}
