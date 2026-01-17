import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, CreditCard, ClipboardCheck, TrendingUp } from "lucide-react";

const reportTypes = [
  {
    id: "enrollment",
    name: "Enrollment Report",
    description: "Student enrollment statistics by grade and stream",
    icon: Users,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "attendance",
    name: "Attendance Report",
    description: "Daily and termly attendance summaries",
    icon: ClipboardCheck,
    color: "bg-success/10 text-success",
  },
  {
    id: "fees",
    name: "Fee Collection Report",
    description: "Fee collection and outstanding balances",
    icon: CreditCard,
    color: "bg-accent/10 text-accent",
  },
  {
    id: "performance",
    name: "CBC Performance Report",
    description: "Student performance across learning areas",
    icon: TrendingUp,
    color: "bg-info/10 text-info",
  },
  {
    id: "termly",
    name: "Term Report Cards",
    description: "Individual student term reports for parents",
    icon: FileText,
    color: "bg-warning/10 text-warning",
  },
];

const recentReports = [
  { name: "Term 2 Fee Collection Summary", date: "2024-02-15", type: "fees", format: "PDF" },
  { name: "Grade 4A Attendance - February", date: "2024-02-14", type: "attendance", format: "Excel" },
  { name: "School Enrollment 2024", date: "2024-02-10", type: "enrollment", format: "PDF" },
  { name: "Grade 6 CBC Performance", date: "2024-02-08", type: "performance", format: "PDF" },
];

export default function Reports() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Reports</h1>
            <p className="page-subtitle">Generate and export school reports</p>
          </div>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <report.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">{report.name}</h3>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-2">
                <FileText className="w-4 h-4" />
                Generate
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">Recently Generated</h3>
        </div>
        <div className="divide-y divide-border">
          {recentReports.map((report, idx) => (
            <div
              key={idx}
              className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{report.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.date).toLocaleDateString("en-KE")} • {report.format}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
