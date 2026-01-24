import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CreditCard, TrendingUp, AlertCircle, CheckCircle, Download, FileText, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useFees, useFeeSummary, useStudentFees, formatCurrency } from "@/hooks/useFees";
import { RecordPaymentDialog } from "@/components/fees/RecordPaymentDialog";
import { CreateInvoiceDialog } from "@/components/fees/CreateInvoiceDialog";
import { useState } from "react";
import { useFeeSchedules } from "@/hooks/useFeeSchedules";
import { AddFeeScheduleDialog } from "@/components/fees/AddFeeScheduleDialog";

const statusStyles = { 
  paid: "bg-success/10 text-success border-success/20", 
  partial: "bg-warning/10 text-warning border-warning/20", 
  pending: "bg-destructive/10 text-destructive border-destructive/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20"
};

export default function Fees() {
  const { user, selectedChildId, setSelectedChildId, hasPermission } = useRole();
  const [searchTerm, setSearchTerm] = useState("");
  const canCollect = hasPermission("fees:collect");
  const selectedChild = user.children?.find((child) => child.id === selectedChildId);

  const { data: fees, isLoading } = useFees();
  const { data: summary } = useFeeSummary();
  const { data: studentFees } = useStudentFees(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );
  const { data: feeSchedules = [] } = useFeeSchedules(user.role !== "parent");

  // Parent view - shows their child's fee statement
  if (user.role === "parent") {
    const totalFee = studentFees?.reduce((sum, f) => sum + Number(f.amount), 0) || 0;
    const totalPaid = studentFees?.reduce((sum, f) => sum + Number(f.paid_amount || 0), 0) || 0;
    const balance = totalFee - totalPaid;

    return (
      <DashboardLayout>
        <div className="page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title font-display">Fee Statement</h1>
              <p className="page-subtitle">View fee balance and payment history</p>
            </div>
            {user.children && user.children.length > 1 && (
              <Select
                value={selectedChildId || ""}
                onValueChange={(value) => setSelectedChildId(value)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {user.children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">
                {selectedChild?.full_name || "Student record not linked"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {selectedChild?.classes
                  ? `${selectedChild.classes.grade} ${selectedChild.classes.stream}`
                  : "Grade unavailable"}{" "}
                • Term 1, {new Date().getFullYear()}
              </p>
            </div>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Download Statement</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Total Fee</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalFee)}</p>
            </div>
            <div className="p-4 bg-success/10 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(balance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Fee Records & Payments</h3>
          </div>
          <div className="divide-y divide-border">
            {studentFees && studentFees.length > 0 ? (
              studentFees.map((fee) => (
                <div key={fee.id} className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{fee.fee_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Term {fee.term} • Due: {new Date(fee.due_date).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{formatCurrency(Number(fee.amount))}</p>
                    <Badge variant="outline" className={statusStyles[fee.status as keyof typeof statusStyles]}>
                      {fee.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-muted-foreground">
                No fee records found
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter fees by search term
  const filteredFees = fees?.filter((fee: any) => {
    const studentName = fee.student?.full_name?.toLowerCase() || "";
    const admNo = fee.student?.admission_number?.toLowerCase() || "";
    return studentName.includes(searchTerm.toLowerCase()) || admNo.includes(searchTerm.toLowerCase());
  }) || [];

  // Admin/Bursar view
  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Fee Management</h1>
            <p className="page-subtitle">Track fee collection and generate statements</p>
          </div>
          {canCollect && (
            <div className="flex gap-2">
              <CreateInvoiceDialog />
              <RecordPaymentDialog />
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display font-semibold text-foreground">Grade Fee Schedules</h3>
            <p className="text-sm text-muted-foreground">Set the required amount per grade and term.</p>
          </div>
          {canCollect && <AddFeeScheduleDialog />}
        </div>
        {feeSchedules.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium">Grade</th>
                  <th className="py-2 text-left font-medium">Term</th>
                  <th className="py-2 text-left font-medium">Academic Year</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {feeSchedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td className="py-2">{schedule.grade}</td>
                    <td className="py-2">Term {schedule.term}</td>
                    <td className="py-2">{schedule.academic_year}</td>
                    <td className="py-2 text-right">{formatCurrency(Number(schedule.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No fee schedules yet. Add your first schedule.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-lg font-bold">{formatCurrency(summary?.totalExpected || 0)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-lg font-bold">{formatCurrency(summary?.totalCollected || 0)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold">{formatCurrency(summary?.totalBalance || 0)}</p>
          </div>
        </div>
        <div className="bg-primary rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-primary-foreground/70">Collection Rate</p>
            <p className="text-lg font-bold text-primary-foreground">{summary?.collectionRate || 0}%</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search student..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="data-table overflow-x-auto bg-card rounded-xl border border-border/50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredFees.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Student</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Fee Type</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Total</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Paid</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Balance</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFees.map((fee: any) => {
                const balance = Number(fee.amount) - Number(fee.paid_amount || 0);
                const classInfo = fee.student?.class;
                return (
                  <tr key={fee.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{fee.student?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {fee.student?.admission_number}
                        {classInfo && ` • Grade ${classInfo.grade} ${classInfo.stream}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fee.fee_type}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(Number(fee.amount))}</td>
                    <td className="px-4 py-3 text-right text-sm text-success">{formatCurrency(Number(fee.paid_amount || 0))}</td>
                    <td className="px-4 py-3 text-right text-sm text-destructive font-medium">{formatCurrency(balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className={statusStyles[fee.status as keyof typeof statusStyles]}>
                        {fee.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        <FileText className="w-4 h-4 mr-1" />Statement
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No fee records found. Create invoices to get started.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
