import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useFees, useRecordPayment, formatCurrency } from "@/hooks/useFees";

export function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [feeId, setFeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const { data: fees, isLoading } = useFees();
  const recordPayment = useRecordPayment();

  // Only show fees that have outstanding balance
  const unpaidFees = fees?.filter((f) => {
    const balance = Number(f.amount) - Number(f.paid_amount || 0);
    return balance > 0;
  }) || [];

  const selectedFee = fees?.find((f) => f.id === feeId);
  const maxPayment = selectedFee 
    ? Number(selectedFee.amount) - Number(selectedFee.paid_amount || 0) 
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    recordPayment.mutate(
      {
        feeId,
        amount: Number(amount),
        paymentMethod,
        paymentReference,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setFeeId("");
    setAmount("");
    setPaymentMethod("");
    setPaymentReference("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Fee Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Fee Record</Label>
            <Select value={feeId} onValueChange={setFeeId}>
              <SelectTrigger disabled={isLoading || unpaidFees.length === 0}>
                <SelectValue placeholder="Select student fee" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    Loading fee records...
                  </SelectItem>
                ) : unpaidFees.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No unpaid fee records found
                  </SelectItem>
                ) : (
                  unpaidFees.map((fee) => {
                    const balance = Number(fee.amount) - Number(fee.paid_amount || 0);
                    const studentName = (fee as any).student?.full_name || "Unknown";
                    return (
                      <SelectItem key={fee.id} value={fee.id}>
                        {studentName} - {fee.fee_type} (Balance: {formatCurrency(balance)})
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
            {!isLoading && unpaidFees.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Create an invoice or ensure a balance is outstanding to record a payment.
              </p>
            )}
          </div>

          {selectedFee && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Fee Type:</strong> {selectedFee.fee_type}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(Number(selectedFee.amount))}</p>
              <p><strong>Already Paid:</strong> {formatCurrency(Number(selectedFee.paid_amount || 0))}</p>
              <p className="text-primary font-semibold"><strong>Balance:</strong> {formatCurrency(maxPayment)}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Payment Amount (KES)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              max={maxPayment}
              min={1}
            />
            {maxPayment > 0 && (
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(maxPayment)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Reference</Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., M-Pesa code or receipt number"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!feeId || !amount || !paymentMethod || !paymentReference || recordPayment.isPending}
            >
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
