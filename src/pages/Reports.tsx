import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Users, CreditCard, ClipboardCheck, TrendingUp } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ReportRole = "admin" | "teacher" | "parent" | "bursar";

const reportTypes = [
  {
    id: "enrollment",
    name: "Enrollment Report",
    description: "Student enrollment statistics by grade and stream",
    icon: Users,
    color: "bg-primary/10 text-primary",
    roles: ["admin"] as ReportRole[],
  },
  {
    id: "attendance",
    name: "Attendance Report",
    description: "Daily and termly attendance summaries",
    icon: ClipboardCheck,
    color: "bg-success/10 text-success",
    roles: ["admin", "teacher", "parent"] as ReportRole[],
  },
  {
    id: "fees",
    name: "Fee Collection Report",
    description: "Fee collection and outstanding balances",
    icon: CreditCard,
    color: "bg-accent/10 text-accent",
    roles: ["admin", "bursar", "parent"] as ReportRole[],
  },
  {
    id: "performance",
    name: "CBC Performance Report",
    description: "Student performance across learning areas",
    icon: TrendingUp,
    color: "bg-info/10 text-info",
    roles: ["admin", "teacher", "parent"] as ReportRole[],
  },
  {
    id: "termly",
    name: "Term Report Cards",
    description: "Individual student term reports for parents",
    icon: FileText,
    color: "bg-warning/10 text-warning",
    roles: ["admin", "teacher", "parent"] as ReportRole[],
  },
];

type RecentReport = {
  name: string;
  date: string;
  type: string;
  format: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "N/A";
  return date.toISOString().split("T")[0];
};

const toCsv = (rows: Record<string, string | number | null | undefined>[]) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: string | number | null | undefined) => {
    const text = String(value ?? "");
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(",")),
  ];
  return lines.join("\n");
};

const downloadCsv = (filename: string, rows: Record<string, string | number | null | undefined>[]) => {
  const csv = toCsv(rows);
  if (!csv) {
    toast.info("No data available for this report yet.");
    return;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function Reports() {
  const { user, selectedChildId } = useRole();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: teacherClasses = [] } = useQuery({
    queryKey: ["teacher-classes-reports", user.id],
    queryFn: async () => {
      if (user.role !== "teacher") return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, grade, stream, teacher_id")
        .eq("teacher_id", user.id)
        .order("grade")
        .order("stream");
      if (error) throw error;
      return data || [];
    },
    enabled: user.role === "teacher",
  });

  const teacherClassIds = teacherClasses.map((cls) => cls.id);

  const { data: recentReports = [] } = useQuery({
    queryKey: ["recent-reports", user.role, selectedChildId, teacherClassIds],
    queryFn: async () => {
      const items: RecentReport[] = [];

      if (user.role === "parent") {
        if (!selectedChildId) return [];
        const [{ data: assessments }, { data: attendance }, { data: fees }] = await Promise.all([
          supabase
            .from("assessments")
            .select("id, learning_area, created_at")
            .eq("student_id", selectedChildId)
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("attendance")
            .select("id, date, status")
            .eq("student_id", selectedChildId)
            .order("date", { ascending: false })
            .limit(2),
          supabase
            .from("fees")
            .select("id, fee_type, created_at, status")
            .eq("student_id", selectedChildId)
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        assessments?.forEach((assessment) => {
          items.push({
            name: `${assessment.learning_area} assessment summary`,
            date: formatDate(assessment.created_at),
            type: "performance",
            format: "PDF",
          });
        });

        attendance?.forEach((record) => {
          items.push({
            name: `Attendance (${record.status})`,
            date: formatDate(record.date),
            type: "attendance",
            format: "Excel",
          });
        });

        fees?.forEach((fee) => {
          items.push({
            name: `${fee.fee_type} fee statement`,
            date: formatDate(fee.created_at),
            type: "fees",
            format: "PDF",
          });
        });
      }

      if (user.role === "teacher") {
        if (teacherClassIds.length === 0) return [];
        const [{ data: assessments }, { data: attendance }, { data: students }] = await Promise.all([
          supabase
            .from("assessments")
            .select("id, learning_area, created_at, class:classes(grade, stream)")
            .in("class_id", teacherClassIds)
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("attendance")
            .select("id, date, class:classes(grade, stream)")
            .in("class_id", teacherClassIds)
            .order("date", { ascending: false })
            .limit(2),
          supabase
            .from("students")
            .select("id, full_name, created_at, class:classes(grade, stream)")
            .in("class_id", teacherClassIds)
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        assessments?.forEach((assessment) => {
          items.push({
            name: `${assessment.learning_area} performance (${assessment.class?.grade || ""}${assessment.class?.stream || ""})`,
            date: formatDate(assessment.created_at),
            type: "performance",
            format: "PDF",
          });
        });

        attendance?.forEach((record) => {
          items.push({
            name: `Attendance report (${record.class?.grade || ""}${record.class?.stream || ""})`,
            date: formatDate(record.date),
            type: "attendance",
            format: "Excel",
          });
        });

        students?.forEach((student) => {
          items.push({
            name: `${student.full_name} enrollment`,
            date: formatDate(student.created_at),
            type: "enrollment",
            format: "PDF",
          });
        });
      }

      if (user.role === "bursar") {
        const { data: payments } = await supabase
          .from("fees")
          .select("id, fee_type, payment_date, paid_amount, student:students(full_name)")
          .not("payment_date", "is", null)
          .order("payment_date", { ascending: false })
          .limit(4);

        payments?.forEach((payment) => {
          items.push({
            name: `${payment.fee_type} payment (${payment.student?.full_name || "student"})`,
            date: formatDate(payment.payment_date),
            type: "fees",
            format: "PDF",
          });
        });
      }

      if (user.role === "admin") {
        const [{ data: fees }, { data: assessments }, { data: attendance }] = await Promise.all([
          supabase
            .from("fees")
            .select("id, fee_type, payment_date")
            .not("payment_date", "is", null)
            .order("payment_date", { ascending: false })
            .limit(2),
          supabase
            .from("assessments")
            .select("id, learning_area, created_at, class:classes(grade, stream)")
            .order("created_at", { ascending: false })
            .limit(2),
          supabase
            .from("attendance")
            .select("id, date, class:classes(grade, stream)")
            .order("date", { ascending: false })
            .limit(2),
        ]);

        fees?.forEach((fee) => {
          items.push({
            name: `${fee.fee_type} collection summary`,
            date: formatDate(fee.payment_date),
            type: "fees",
            format: "PDF",
          });
        });

        assessments?.forEach((assessment) => {
          items.push({
            name: `${assessment.learning_area} performance (${assessment.class?.grade || ""}${assessment.class?.stream || ""})`,
            date: formatDate(assessment.created_at),
            type: "performance",
            format: "PDF",
          });
        });

        attendance?.forEach((record) => {
          items.push({
            name: `Attendance report (${record.class?.grade || ""}${record.class?.stream || ""})`,
            date: formatDate(record.date),
            type: "attendance",
            format: "Excel",
          });
        });
      }

      return items
        .filter((item) => item.date !== "N/A")
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 4);
    },
  });

  const visibleReportTypes = reportTypes.filter((report) => report.roles.includes(user.role));

  const generateReport = async (reportId: string) => {
    try {
      setGeneratingId(reportId);

      if (user.role === "parent" && !selectedChildId) {
        toast.error("No student linked to this parent.");
        return;
      }

      if (user.role === "teacher" && teacherClassIds.length === 0) {
        toast.error("No classes assigned to this teacher.");
        return;
      }

      if (reportId === "enrollment") {
        const { data, error } = await supabase
          .from("students")
          .select("full_name, admission_number, status, created_at, class:classes(grade, stream)")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;

        const rows = (data || []).map((student) => ({
          student_name: student.full_name,
          admission_number: student.admission_number,
          grade: student.class?.grade || "",
          stream: student.class?.stream || "",
          status: student.status,
          created_at: formatDate(student.created_at),
        }));

        downloadCsv("enrollment-report.csv", rows);
        return;
      }

      if (reportId === "attendance") {
        let query = supabase
          .from("attendance")
          .select("date, status, student:students(full_name, admission_number), class:classes(grade, stream)")
          .order("date", { ascending: false })
          .limit(500);

        if (user.role === "parent") {
          query = query.eq("student_id", selectedChildId);
        }

        if (user.role === "teacher") {
          query = query.in("class_id", teacherClassIds);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []).map((record) => ({
          date: formatDate(record.date),
          student: record.student?.full_name || "",
          admission_number: record.student?.admission_number || "",
          grade: record.class?.grade || "",
          stream: record.class?.stream || "",
          status: record.status,
        }));

        downloadCsv("attendance-report.csv", rows);
        return;
      }

      if (reportId === "fees") {
        let query = supabase
          .from("fees")
          .select("fee_type, amount, paid_amount, status, due_date, payment_date, student:students(full_name, admission_number, class:classes(grade, stream))")
          .order("created_at", { ascending: false })
          .limit(500);

        if (user.role === "parent") {
          query = query.eq("student_id", selectedChildId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []).map((fee) => ({
          student: fee.student?.full_name || "",
          admission_number: fee.student?.admission_number || "",
          grade: fee.student?.class?.grade || "",
          stream: fee.student?.class?.stream || "",
          fee_type: fee.fee_type,
          amount: fee.amount,
          paid_amount: fee.paid_amount || 0,
          status: fee.status,
          due_date: formatDate(fee.due_date),
          payment_date: formatDate(fee.payment_date),
        }));

        downloadCsv("fee-collection-report.csv", rows);
        return;
      }

      if (reportId === "performance" || reportId === "termly") {
        let query = supabase
          .from("assessments")
          .select("learning_area, performance_level, score, term, academic_year, created_at, student:students(full_name, admission_number), class:classes(grade, stream)")
          .order("created_at", { ascending: false })
          .limit(500);

        if (user.role === "parent") {
          query = query.eq("student_id", selectedChildId);
        }

        if (user.role === "teacher") {
          query = query.in("class_id", teacherClassIds);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []).map((assessment) => ({
          student: assessment.student?.full_name || "",
          admission_number: assessment.student?.admission_number || "",
          grade: assessment.class?.grade || "",
          stream: assessment.class?.stream || "",
          learning_area: assessment.learning_area,
          performance_level: assessment.performance_level,
          score: assessment.score ?? "",
          term: assessment.term,
          academic_year: assessment.academic_year,
          created_at: formatDate(assessment.created_at),
        }));

        downloadCsv("performance-report.csv", rows);
        return;
      }

      toast.error("Unsupported report type.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate report.";
      toast.error(message);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Reports</h1>
            <p className="page-subtitle">
              {user.role === "parent"
                ? "Access your child's reports"
                : user.role === "teacher"
                ? "Generate class and performance reports"
                : user.role === "bursar"
                ? "Generate finance and collection reports"
                : "Generate and export school reports"}
            </p>
          </div>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {visibleReportTypes.map((report) => (
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
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => generateReport(report.id)}
                disabled={generatingId === report.id}
              >
                <FileText className="w-4 h-4" />
                {generatingId === report.id ? "Generating..." : "Generate"}
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
          {recentReports.length > 0 ? (
            recentReports.map((report, idx) => (
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => generateReport(report.type)}
                  disabled={generatingId === report.type}
                >
                  <Download className="w-4 h-4" />
                  {generatingId === report.type ? "Generating..." : "Download"}
                </Button>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-muted-foreground">No reports generated yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
