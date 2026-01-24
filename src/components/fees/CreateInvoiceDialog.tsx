import { useEffect, useMemo, useState } from "react";
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
import { FileText } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useCreateInvoice, FEE_TYPES } from "@/hooks/useFees";
import { useFeeSchedules } from "@/hooks/useFeeSchedules";

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [feeType, setFeeType] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [term, setTerm] = useState("1");

  const { data: students } = useStudents();
  const { data: feeSchedules = [] } = useFeeSchedules();
  const createInvoice = useCreateInvoice();
  const currentYear = new Date().getFullYear().toString();

  const selectedStudent = students?.find((student) => student.id === studentId);
  const studentGrade = selectedStudent?.classes?.grade;

  const scheduleAmount = useMemo(() => {
    if (!studentGrade) return null;
    const schedule = feeSchedules.find(
      (item) =>
        item.grade === studentGrade &&
        item.term === Number(term) &&
        item.academic_year === currentYear
    );
    return schedule?.amount ?? null;
  }, [feeSchedules, studentGrade, term, currentYear]);

  useEffect(() => {
    if (!amount && scheduleAmount !== null) {
      setAmount(scheduleAmount.toString());
    }
  }, [amount, scheduleAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createInvoice.mutate(
      {
        student_id: studentId,
        fee_type: feeType,
        amount: Number(amount),
        due_date: dueDate,
        academic_year: currentYear,
        term: Number(term),
        status: "pending",
        paid_amount: 0,
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
    setStudentId("");
    setFeeType("");
    setAmount("");
    setDueDate("");
    setTerm("1");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Fee Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name} ({student.admission_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee type" />
              </SelectTrigger>
              <SelectContent>
                {FEE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount (KES)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={1}
            />
            {scheduleAmount !== null && (
              <p className="text-xs text-muted-foreground">
                Grade fee schedule: KES {Number(scheduleAmount).toLocaleString("en-KE")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!studentId || !feeType || !amount || !dueDate || createInvoice.isPending}
            >
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
