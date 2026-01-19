import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, CreditCard, TrendingUp, AlertCircle, CheckCircle, Download, FileText } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

const feeRecords = [
  { id: 1, student: "Grace Wanjiku Kamau", admNo: "2024/001", grade: "Grade 4A", total: 45000, paid: 45000, balance: 0, status: "paid" },
  { id: 2, student: "Peter Ochieng Otieno", admNo: "2024/002", grade: "Grade 6B", total: 48000, paid: 33000, balance: 15000, status: "partial" },
  { id: 3, student: "Faith Njeri Mwangi", admNo: "2024/003", grade: "Grade 3A", total: 42000, paid: 42000, balance: 0, status: "paid" },
  { id: 4, student: "David Kipchoge Korir", admNo: "2024/004", grade: "Grade 7A", total: 52000, paid: 20000, balance: 32000, status: "partial" },
  { id: 5, student: "Sarah Akinyi Odhiambo", admNo: "2024/005", grade: "PP2", total: 38000, paid: 0, balance: 38000, status: "unpaid" },
];

const statusStyles = { paid: "bg-success/10 text-success border-success/20", partial: "bg-warning/10 text-warning border-warning/20", unpaid: "bg-destructive/10 text-destructive border-destructive/20" };
const formatCurrency = (amount: number) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount);

// Parent payment history
const paymentHistory = [
  { date: "2024-01-15", amount: 25000, method: "M-Pesa", reference: "QH7X8K9L2M" },
  { date: "2024-01-30", amount: 20000, method: "Bank Transfer", reference: "TXN-4829371" },
];

export default function Fees() {
  const { user, hasPermission } = useRole();
  const canCollect = hasPermission("fees:collect");

  // Parent view - shows their child's fee statement
  if (user.role === "parent") {
    const childFee = feeRecords[0]; // Grace's record
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title font-display">Fee Statement</h1>
          <p className="page-subtitle">View fee balance and payment history</p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Grace Wanjiku Kamau</h2>
              <p className="text-sm text-muted-foreground">Grade 4A • Term 2, 2024</p>
            </div>
            <Button variant="outline" className="gap-2"><Download className="w-4 h-4" />Download Statement</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Total Fee</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(childFee.total)}</p>
            </div>
            <div className="p-4 bg-success/10 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-success">{formatCurrency(childFee.paid)}</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-xl text-center">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(childFee.balance)}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-display font-semibold text-foreground">Payment History</h3></div>
          <div className="divide-y divide-border">
            {paymentHistory.map((payment, idx) => (
              <div key={idx} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{new Date(payment.date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
                  <p className="text-sm text-muted-foreground">{payment.method} • Ref: {payment.reference}</p>
                </div>
                <span className="font-bold text-success">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin/Bursar view
  const totalExpected = feeRecords.reduce((sum, r) => sum + r.total, 0);
  const totalCollected = feeRecords.reduce((sum, r) => sum + r.paid, 0);
  const totalBalance = feeRecords.reduce((sum, r) => sum + r.balance, 0);
  const collectionRate = Math.round((totalCollected / totalExpected) * 100);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Fee Management</h1>
            <p className="page-subtitle">Track fee collection and generate statements</p>
          </div>
          {canCollect && <Button className="gap-2"><Plus className="w-4 h-4" />Record Payment</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><CreditCard className="w-5 h-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Expected</p><p className="text-lg font-bold">{formatCurrency(totalExpected)}</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-success" /></div>
          <div><p className="text-xs text-muted-foreground">Collected</p><p className="text-lg font-bold">{formatCurrency(totalCollected)}</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold">{formatCurrency(totalBalance)}</p></div>
        </div>
        <div className="bg-primary rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary-foreground" /></div>
          <div><p className="text-xs text-primary-foreground/70">Collection Rate</p><p className="text-lg font-bold text-primary-foreground">{collectionRate}%</p></div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search student..." className="pl-10" /></div>
      </div>

      <div className="data-table overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Student</th>
            <th className="text-left text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Grade</th>
            <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Total</th>
            <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Paid</th>
            <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Balance</th>
            <th className="text-center text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Status</th>
            <th className="text-right text-xs font-semibold text-muted-foreground uppercase px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {feeRecords.map((record) => (
              <tr key={record.id} className="hover:bg-muted/30">
                <td className="px-4 py-3"><p className="font-medium">{record.student}</p><p className="text-xs text-muted-foreground">{record.admNo}</p></td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{record.grade}</td>
                <td className="px-4 py-3 text-right text-sm font-medium">{formatCurrency(record.total)}</td>
                <td className="px-4 py-3 text-right text-sm text-success">{formatCurrency(record.paid)}</td>
                <td className="px-4 py-3 text-right text-sm text-destructive font-medium">{formatCurrency(record.balance)}</td>
                <td className="px-4 py-3 text-center"><Badge variant="outline" className={statusStyles[record.status as keyof typeof statusStyles]}>{record.status}</Badge></td>
                <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm"><FileText className="w-4 h-4 mr-1" />Statement</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
