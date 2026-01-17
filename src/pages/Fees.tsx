import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, CreditCard, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const feeRecords = [
  { id: 1, student: "Grace Wanjiku Kamau", admNo: "2024/001", grade: "Grade 4A", total: 45000, paid: 45000, balance: 0, status: "paid" },
  { id: 2, student: "Peter Ochieng Otieno", admNo: "2024/002", grade: "Grade 6B", total: 48000, paid: 33000, balance: 15000, status: "partial" },
  { id: 3, student: "Faith Njeri Mwangi", admNo: "2024/003", grade: "Grade 3A", total: 42000, paid: 42000, balance: 0, status: "paid" },
  { id: 4, student: "David Kipchoge Korir", admNo: "2024/004", grade: "Grade 7A", total: 52000, paid: 20000, balance: 32000, status: "partial" },
  { id: 5, student: "Sarah Akinyi Odhiambo", admNo: "2024/005", grade: "PP2", total: 38000, paid: 0, balance: 38000, status: "unpaid" },
  { id: 6, student: "Joy Wambui Ngugi", admNo: "2024/006", grade: "Grade 5A", total: 46000, paid: 46000, balance: 0, status: "paid" },
];

const statusStyles = {
  paid: "bg-success/10 text-success border-success/20",
  partial: "bg-warning/10 text-warning border-warning/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount);
};

export default function Fees() {
  const totalExpected = feeRecords.reduce((sum, r) => sum + r.total, 0);
  const totalCollected = feeRecords.reduce((sum, r) => sum + r.paid, 0);
  const totalBalance = feeRecords.reduce((sum, r) => sum + r.balance, 0);
  const collectionRate = Math.round((totalCollected / totalExpected) * 100);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Fee Management</h1>
            <p className="page-subtitle">Track fee collection and generate statements</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Expected (Term)</p>
              <p className="text-lg font-bold font-display text-foreground">{formatCurrency(totalExpected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold font-display text-foreground">{formatCurrency(totalCollected)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="text-lg font-bold font-display text-foreground">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </div>
        <div className="bg-primary rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Collection Rate</p>
              <p className="text-lg font-bold font-display text-primary-foreground">{collectionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search student by name or admission number..." className="pl-10" />
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="data-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Student</th>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Grade</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Total Fee</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Paid</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Balance</th>
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {feeRecords.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{record.student}</p>
                      <p className="text-xs text-muted-foreground">{record.admNo}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{record.grade}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-foreground">{formatCurrency(record.total)}</td>
                  <td className="px-4 py-3 text-right text-sm text-success">{formatCurrency(record.paid)}</td>
                  <td className="px-4 py-3 text-right text-sm text-destructive font-medium">{formatCurrency(record.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={statusStyles[record.status as keyof typeof statusStyles]}>
                      {record.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">
                      View Statement
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
