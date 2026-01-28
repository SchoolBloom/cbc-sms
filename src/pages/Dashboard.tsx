import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { Users, GraduationCap, CreditCard, TrendingUp, BookOpen, ClipboardCheck, Bell, Calendar } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentFees, formatCurrency } from "@/hooks/useFees";
import { useStudentAssessments } from "@/hooks/useAssessments";
import { useStudentAttendanceHistory } from "@/hooks/useAttendance";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useAcademicYear } from "@/hooks/useAcademicYear";

export default function Dashboard() {
  const { user, selectedChildId, setSelectedChildId } = useRole();
  const { data: academicYear } = useAcademicYear();
  const selectedChild = user.children?.find((child) => child.id === selectedChildId);
  const childInitials = selectedChild?.full_name
    ? selectedChild.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "??";
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartDate = weekStart.toISOString().split("T")[0];
  const assessmentWeekStart = new Date();
  assessmentWeekStart.setDate(assessmentWeekStart.getDate() - 7);
  const assessmentWeekDate = assessmentWeekStart.toISOString();

  const { data: studentCount = 0 } = useQuery({
    queryKey: ["dashboard-student-count", user.role],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: user.role === "admin" || user.role === "bursar",
  });

  const { data: classCount = 0 } = useQuery({
    queryKey: ["dashboard-class-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("classes")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
    enabled: user.role === "admin",
  });

  const { data: feeSummary = { totalExpected: 0, totalCollected: 0, totalBalance: 0, collectionRate: 0 } } = useQuery({
    queryKey: ["dashboard-fee-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("amount, paid_amount");

      if (error) throw error;

      const totalExpected = (data || []).reduce((sum, fee) => sum + Number(fee.amount), 0);
      const totalCollected = (data || []).reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
      const totalBalance = totalExpected - totalCollected;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

      return { totalExpected, totalCollected, totalBalance, collectionRate };
    },
    enabled: user.role === "admin" || user.role === "bursar",
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["dashboard-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("performance_level");
      if (error) throw error;
      return data || [];
    },
    enabled: user.role === "admin",
  });
  const { data: studentFees = [] } = useStudentFees(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );
  const { data: studentAssessments = [] } = useStudentAssessments(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );
  const { data: attendanceHistory = [] } = useStudentAttendanceHistory(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );

  const { data: adminAttendanceRate = 0 } = useQuery({
    queryKey: ["admin-attendance-rate", weekStartDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .gte("date", weekStartDate);

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const presentCount = data.filter((record) => record.status !== "absent").length;
      return Math.round((presentCount / data.length) * 100);
    },
    enabled: user.role === "admin",
  });

  const { data: teacherClasses = [] } = useQuery({
    queryKey: ["teacher-classes", user.id],
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
  const teacherClassLabels = teacherClasses.map((cls) => `${cls.grade}${cls.stream}`);

  const { data: teacherStudentsCount = 0 } = useQuery({
    queryKey: ["teacher-student-count", teacherClassIds],
    queryFn: async () => {
      if (!teacherClassIds.length) return 0;
      const { count, error } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("class_id", teacherClassIds)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: user.role === "teacher",
  });

  const { data: teacherAttendanceRate = 0 } = useQuery({
    queryKey: ["teacher-attendance-rate", teacherClassIds, today],
    queryFn: async () => {
      if (!teacherClassIds.length) return 0;
      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .in("class_id", teacherClassIds)
        .eq("date", today);
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      const presentCount = data.filter((record) => record.status !== "absent").length;
      return Math.round((presentCount / data.length) * 100);
    },
    enabled: user.role === "teacher",
  });

  const { data: teacherAssessmentsWeek = 0 } = useQuery({
    queryKey: ["teacher-assessments-week", teacherClassIds, assessmentWeekDate],
    queryFn: async () => {
      if (!teacherClassIds.length) return 0;
      const { count, error } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .in("class_id", teacherClassIds)
        .gte("created_at", assessmentWeekDate);
      if (error) throw error;
      return count || 0;
    },
    enabled: user.role === "teacher",
  });

  const { data: parentNoticesCount = 0 } = useQuery({
    queryKey: ["parent-notices", user.role],
    queryFn: async () => {
      if (user.role !== "parent") return 0;
      const { count, error } = await supabase
        .from("notices")
        .select("id", { count: "exact", head: true })
        .eq("published", true)
        .overlaps("target_audience", ["parents", "all"]);
      if (error) throw error;
      return count || 0;
    },
    enabled: user.role === "parent",
  });

  const { data: parentNotices = [] } = useQuery({
    queryKey: ["parent-notices-list", user.role],
    queryFn: async () => {
      if (user.role !== "parent") return [];
      const { data, error } = await supabase
        .from("notices")
        .select("id, title, published_at, created_at")
        .eq("published", true)
        .overlaps("target_audience", ["parents", "all"])
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
    enabled: user.role === "parent",
  });

  const { data: bursarRecentPayments = [] } = useQuery({
    queryKey: ["bursar-recent-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("id, paid_amount, payment_method, payment_date, student:students(full_name, class:classes(grade, stream))")
        .not("payment_date", "is", null)
        .order("payment_date", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
    enabled: user.role === "bursar",
  });

  const { data: bursarBalances = [] } = useQuery({
    queryKey: ["bursar-high-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("id, amount, paid_amount, student:students(full_name, class:classes(grade, stream))")
        .not("status", "eq", "paid");
      if (error) throw error;
      const rows = (data || []).map((fee) => ({
        ...fee,
        balance: Number(fee.amount) - Number(fee.paid_amount || 0),
      }));
      return rows.sort((a, b) => b.balance - a.balance).slice(0, 3);
    },
    enabled: user.role === "bursar",
  });

  const { data: bursarTodayReceipts = { total: 0, count: 0 } } = useQuery({
    queryKey: ["bursar-today-receipts", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("paid_amount")
        .eq("payment_date", today);
      if (error) throw error;
      const total = (data || []).reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
      return { total, count: data?.length || 0 };
    },
    enabled: user.role === "bursar",
  });

  const { data: bursarByGrade = [] } = useQuery({
    queryKey: ["bursar-collection-grade"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fees")
        .select("amount, paid_amount, student:students(class:classes(grade, stream))");
      if (error) throw error;

      const gradeMap = new Map<string, { expected: number; collected: number }>();
      (data || []).forEach((fee) => {
        const grade = fee.student?.class?.grade || "Unknown";
        const bucket = gradeMap.get(grade) || { expected: 0, collected: 0 };
        bucket.expected += Number(fee.amount);
        bucket.collected += Number(fee.paid_amount || 0);
        gradeMap.set(grade, bucket);
      });

      return Array.from(gradeMap.entries())
        .map(([grade, stats]) => ({ grade, ...stats }))
        .sort((a, b) => a.grade.localeCompare(b.grade));
    },
    enabled: user.role === "bursar",
  });

  const attendanceRate = attendanceHistory.length
    ? Math.round(
        (attendanceHistory.filter((a) => a.status !== "absent").length / attendanceHistory.length) * 100
      )
    : 0;
  const totalFee = studentFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const totalPaid = studentFees.reduce((sum, fee) => sum + Number(fee.paid_amount || 0), 0);
  const balance = totalFee - totalPaid;

  const latestBySubject = studentAssessments.reduce((acc, assessment) => {
    const existing = acc[assessment.learning_area];
    if (!existing || new Date(assessment.created_at) > new Date(existing.created_at)) {
      acc[assessment.learning_area] = assessment;
    }
    return acc;
  }, {} as Record<string, (typeof studentAssessments)[number]>);

  const latestPerformance = Object.values(latestBySubject)[0]?.performance_level || "N/A";

  const performanceBreakdown = assessments.reduce(
    (acc, assessment) => {
      const value = String(assessment.performance_level || "").toLowerCase();
      if (value === "exceeds" || value === "ee") acc.exceeds += 1;
      else if (value === "meets" || value === "me") acc.meets += 1;
      else if (value === "approaches" || value === "ae") acc.approaches += 1;
      else if (value === "below" || value === "be") acc.below += 1;
      return acc;
    },
    { exceeds: 0, meets: 0, approaches: 0, below: 0 }
  );
  const performanceTotal =
    performanceBreakdown.exceeds +
    performanceBreakdown.meets +
    performanceBreakdown.approaches +
    performanceBreakdown.below;
  const performancePercent = (count: number) =>
    performanceTotal > 0 ? Math.round((count / performanceTotal) * 100) : 0;

  // Role-specific greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${timeGreeting}, ${user.name.split(" ")[0]}`;
  };

  // Role-specific subtitle
  const getSubtitle = () => {
    switch (user.role) {
      case "admin":
        return "Here's what's happening at Sanaet Education Centre today.";
      case "teacher":
        return teacherClassLabels.length > 0
          ? `You have classes in ${teacherClassLabels.join(", ")} today.`
          : "Your classes will appear here once assigned.";
      case "parent":
        return "Stay updated on your child's progress and school activities.";
      case "bursar":
        return "Overview of fee collection and financial status.";
    }
  };

  const termStart = academicYear
    ? academicYear[`term${academicYear.current_term}_start` as const]
    : null;
  const termEnd = academicYear
    ? academicYear[`term${academicYear.current_term}_end` as const]
    : null;
  const termLabel = academicYear
    ? `Term ${academicYear.current_term}, ${academicYear.label}`
    : "Term";
  const weekLabel = (() => {
    if (!termStart || !termEnd) return "Week -";
    const start = new Date(termStart);
    const end = new Date(termEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Week -";
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
    const totalWeeks = Math.ceil(totalDays / 7);
    const daysSinceStart = Math.floor((new Date().getTime() - start.getTime()) / 86400000);
    const currentWeek = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), totalWeeks);
    return `Week ${currentWeek} of ${totalWeeks}`;
  })();

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title font-display">{getGreeting()}</h1>
            <p className="page-subtitle">{getSubtitle()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{termLabel}</p>
            <p className="text-xs text-muted-foreground">{weekLabel}</p>
          </div>
        </div>
      </div>

      {/* Admin Dashboard */}
      {user.role === "admin" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Students"
              value={studentCount}
              subtitle={`${classCount} classes`}
              icon={Users}
            />
            <StatCard
              title="Classes"
              value={classCount}
              subtitle="Across all grades"
              icon={GraduationCap}
              variant="primary"
            />
            <StatCard
              title="Fee Collection"
              value={formatCurrency(feeSummary?.totalCollected || 0)}
              subtitle={`Expected ${formatCurrency(feeSummary?.totalExpected || 0)}`}
              icon={CreditCard}
            />
            <StatCard
              title="Attendance Rate"
              value={`${adminAttendanceRate}%`}
              subtitle="Last 7 days"
              icon={TrendingUp}
              variant="success"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AttendanceChart />
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">CBC Performance Overview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-success/10 rounded-xl">
                    <p className="text-2xl font-bold text-success font-display">
                      {performancePercent(performanceBreakdown.exceeds)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Exceeding Expectations</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-xl">
                    <p className="text-2xl font-bold text-primary font-display">
                      {performancePercent(performanceBreakdown.meets)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Meeting Expectations</p>
                  </div>
                  <div className="text-center p-4 bg-warning/10 rounded-xl">
                    <p className="text-2xl font-bold text-warning font-display">
                      {performancePercent(performanceBreakdown.approaches)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Approaching Expectations</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <QuickActions />
              <RecentActivity role="admin" />
            </div>
          </div>
        </>
      )}

      {/* Teacher Dashboard */}
      {user.role === "teacher" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="My Classes"
              value={teacherClasses.length}
              subtitle={teacherClassLabels.join(", ") || "No classes assigned"}
              icon={GraduationCap}
              variant="primary"
            />
            <StatCard
              title="Students"
              value={teacherStudentsCount}
              subtitle="In your classes"
              icon={Users}
            />
            <StatCard
              title="Today's Attendance"
              value={`${teacherAttendanceRate}%`}
              subtitle="Today"
              icon={ClipboardCheck}
              variant="success"
            />
            <StatCard
              title="Assessments"
              value={teacherAssessmentsWeek}
              subtitle="Recorded this week"
              icon={BookOpen}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Schedule */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Today's Schedule</h3>
                <div className="space-y-3">
                  {teacherClassLabels.length > 0 ? (
                    teacherClassLabels.map((label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-muted-foreground">Today</span>
                          <span className="font-medium text-foreground">Class {label}</span>
                          <Badge variant="outline">{label}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className="flex items-center justify-between p-3 rounded-lg border bg-card border-border/50"
                    >
                      <span className="text-sm text-muted-foreground">No classes assigned yet.</span>
                    </div>
                  )}
                </div>
              </div>
              <AttendanceChart classIds={teacherClassIds} />
            </div>
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Take Attendance</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <BookOpen className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium">Record Assessment</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <Bell className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium">View Notices</span>
                  </button>
                </div>
              </div>
              <RecentActivity role="teacher" classIds={teacherClassIds} teacherId={user.id} />
            </div>
          </div>
        </>
      )}

      {/* Parent Dashboard */}
      {user.role === "parent" && (
        <>
          {/* Child Info Card */}
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{childInitials}</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-display font-semibold text-foreground">
                    {selectedChild?.full_name || "Student record not linked"}
                  </h2>
                  <p className="text-muted-foreground">
                    {selectedChild?.classes
                      ? `${selectedChild.classes.grade} ${selectedChild.classes.stream}`
                      : "Grade unavailable"}{" "}
                    • Admission No: {selectedChild?.admission_number || "N/A"}
                    • Assessment No: {selectedChild?.assessment_number || "N/A"}
                  </p>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {selectedChild?.status || "Unknown"}
                </Badge>
              </div>
              {user.children && user.children.length > 1 && (
                <div className="w-full sm:w-64">
                  <Select
                    value={selectedChildId || ""}
                    onValueChange={(value) => setSelectedChildId(value)}
                  >
                    <SelectTrigger className="w-full">
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
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Attendance"
              value={`${attendanceRate}%`}
              subtitle="Last 30 days"
              icon={ClipboardCheck}
              variant="success"
            />
            <StatCard
              title="Performance"
              value={latestPerformance}
              subtitle="Latest assessment"
              icon={TrendingUp}
              variant="primary"
            />
            <StatCard
              title="Fee Balance"
              value={formatCurrency(balance)}
              subtitle={balance <= 0 ? "Fully paid" : "Outstanding"}
              icon={CreditCard}
            />
            <StatCard
              title="Notices"
              value={parentNoticesCount}
              subtitle="Published"
              icon={Bell}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Performance */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Recent Performance</h3>
                <div className="space-y-3">
                  {Object.values(latestBySubject).length > 0 ? (
                    Object.values(latestBySubject).slice(0, 4).map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium text-foreground">{result.learning_area}</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground">
                            {result.performance_level}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {result.comments || "No comments"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No assessments recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Attendance History */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">This Week's Attendance</h3>
                <div className="grid grid-cols-5 gap-2">
                  {attendanceHistory.slice(0, 5).map((record) => (
                    <div key={record.id} className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        {new Date(record.date).toLocaleDateString("en-KE", { weekday: "short" })}
                      </p>
                      <div
                        className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                          record.status !== "absent"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {record.status === "absent" ? "×" : "✓"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Upcoming Events */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Latest Notices</h3>
                <div className="space-y-3">
                  {parentNotices.length > 0 ? (
                    parentNotices.map((notice) => (
                      <div key={notice.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {new Date(notice.published_at || notice.created_at).toLocaleDateString("en-KE", {
                              month: "short",
                            })}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {new Date(notice.published_at || notice.created_at).getDate()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{notice.title}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No notices published yet.</p>
                  )}
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Fee Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Term Fee</span>
                    <span className="font-medium text-foreground">{formatCurrency(totalFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-success">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Balance</span>
                      <span className="font-bold text-success">{formatCurrency(balance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bursar Dashboard */}
      {user.role === "bursar" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Expected (Term)"
              value={formatCurrency(feeSummary?.totalExpected || 0)}
              subtitle={`${studentCount} students`}
              icon={CreditCard}
            />
            <StatCard
              title="Collected"
              value={formatCurrency(feeSummary?.totalCollected || 0)}
              subtitle={`${feeSummary?.collectionRate || 0}% collection rate`}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Outstanding"
              value={formatCurrency(feeSummary?.totalBalance || 0)}
              subtitle="Pending balances"
              icon={Calendar}
              variant="primary"
            />
            <StatCard
              title="Today's Receipts"
              value={formatCurrency(bursarTodayReceipts.total)}
              subtitle={`${bursarTodayReceipts.count} payments`}
              icon={CreditCard}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Collection by Grade */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Collection by Grade</h3>
                <div className="space-y-3">
                  {bursarByGrade.length > 0 ? (
                    bursarByGrade.map((row) => (
                      <div key={row.grade} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-foreground">{row.grade}</span>
                          <span className="text-sm text-muted-foreground">
                            {row.expected > 0 ? Math.round((row.collected / row.expected) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-success rounded-full"
                            style={{ width: `${row.expected > 0 ? (row.collected / row.expected) * 100 : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>Collected: {formatCurrency(row.collected)}</span>
                          <span>Expected: {formatCurrency(row.expected)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No fee data available.</p>
                  )}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-display font-semibold text-foreground">Recent Payments</h3>
                </div>
                <div className="divide-y divide-border">
                  {bursarRecentPayments.length > 0 ? (
                    bursarRecentPayments.map((payment) => (
                      <div key={payment.id} className="px-5 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{payment.student?.full_name || "Student"}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.student?.class
                              ? `Grade ${payment.student.class.grade}${payment.student.class.stream}`
                              : "Class"}{" "}
                            • {payment.payment_method || "Payment"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-success">+{formatCurrency(Number(payment.paid_amount || 0))}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.payment_date
                              ? new Date(payment.payment_date).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
                              : "Today"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-5 py-6 text-sm text-muted-foreground">No payments recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm font-medium">Record Payment</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Generate Statement</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <Bell className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium">Send Reminders</span>
                  </button>
                </div>
              </div>

              {/* Defaulters */}
              <div className="bg-card rounded-xl border border-destructive/30 p-5">
                <h3 className="font-display font-semibold text-destructive mb-4">High Balances</h3>
                <div className="space-y-3">
                  {bursarBalances.length > 0 ? (
                    bursarBalances.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground text-sm">{item.student?.full_name || "Student"}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.student?.class
                              ? `Grade ${item.student.class.grade}${item.student.class.stream}`
                              : "Class"}
                          </p>
                        </div>
                        <span className="font-medium text-destructive text-sm">
                          {formatCurrency(item.balance)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No outstanding balances.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
