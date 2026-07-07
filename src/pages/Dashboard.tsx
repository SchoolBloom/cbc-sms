import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicYear } from "@/hooks/useAcademicYear";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useStudentAssessmentRecords } from "@/hooks/useAssessments";
import { useCurrentTeacherId } from "@/hooks/useTeachers";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, TrendingUp, BookOpen, Route, ServerCog, ShieldCheck, FileText, Building2 } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, selectedChildId, setSelectedChildId } = useRole();
  const { session } = useAuth();
  const { data: academicYear } = useAcademicYear();
  const { schoolId, schoolName } = useSchoolScope();
  const { data: platformStats, isLoading: loadingStats } = usePlatformStats(user?.role === "system_admin");
  
  const currentAcademicYear = academicYear?.label || new Date().getFullYear().toString();
  const { data: teacherRecordId } = useCurrentTeacherId();

  const selectedChild = user?.children?.find((child) => child.id === selectedChildId);
  const childInitials = selectedChild?.full_name
    ? selectedChild.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "??";

  // Time range calculation for teacher query (e.g. past week)
  const assessmentWeekDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const { data: systemSchools = [] } = useQuery({
    queryKey: ["system-admin-schools-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: user?.role === "system_admin",
  });



  // ================= SCHOOL ADMIN QUERIES =================
  const { data: studentCount = 0 } = useQuery({
    queryKey: ["dashboard-student-count", schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count, error } = await supabase
        .from("learners")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "admin" && !!schoolId,
  });

  const { data: classCount = 0 } = useQuery({
    queryKey: ["dashboard-class-count", schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count, error } = await supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "admin" && !!schoolId,
  });

  const { data: teacherCount = 0 } = useQuery({
    queryKey: ["dashboard-teacher-count", schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count, error } = await supabase
        .from("teachers")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "admin" && !!schoolId,
  });

  const { data: parentCount = 0 } = useQuery({
    queryKey: ["dashboard-parent-count", schoolId],
    queryFn: async () => {
      if (!schoolId) return 0;
      const { count, error } = await supabase
        .from("parents")
        .select("id", { count: "exact", head: true })
        .eq("school_id", schoolId);
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "admin" && !!schoolId,
  });

  const { data: allAssessments = [] } = useQuery({
    queryKey: ["dashboard-admin-assessments", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("assessment_records")
        .select("rubric_score")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data || [];
    },
    enabled: user?.role === "admin" && !!schoolId,
  });

  // ================= TEACHER QUERIES =================
  const { data: teacherClasses = [] } = useQuery({
    queryKey: ["teacher-classes", teacherRecordId],
    queryFn: async () => {
      if (user?.role !== "teacher" || !teacherRecordId) return [];
      
      // 1. Fetch classes where teacher is the class teacher
      const { data: primaryClasses, error: primaryClassesError } = await supabase
        .from("classes")
        .select("id, grade, stream, teacher_id")
        .eq("teacher_id", teacherRecordId);

      if (primaryClassesError) throw primaryClassesError;

      // 2. Fetch classes where teacher has subject assignments
      const { data: assignedSubjects, error: subjectsError } = await supabase
        .from("subject_assignments")
        .select("class_id, classes(id, grade, stream, teacher_id)")
        .eq("teacher_id", teacherRecordId);

      if (subjectsError) throw subjectsError;

      // Combine them and ensure uniqueness
      const classMap = new Map<string, any>();
      (primaryClasses || []).forEach((c) => {
        classMap.set(c.id, c);
      });
      (assignedSubjects || []).forEach((as) => {
        if (as.classes) {
          const cls = Array.isArray(as.classes) ? as.classes[0] : as.classes;
          if (cls) {
            classMap.set(cls.id, {
              id: cls.id,
              grade: cls.grade,
              stream: cls.stream,
              teacher_id: cls.teacher_id,
            });
          }
        }
      });

      const combined = Array.from(classMap.values());
      // Sort combined classes
      combined.sort((a, b) => {
        const gradeCompare = a.grade.localeCompare(b.grade);
        if (gradeCompare !== 0) return gradeCompare;
        return a.stream.localeCompare(b.stream);
      });

      return combined;
    },
    enabled: user?.role === "teacher" && !!teacherRecordId,
  });

  const teacherClassIds = useMemo(() => teacherClasses.map((cls) => cls.id), [teacherClasses]);
  const teacherClassLabels = useMemo(() => teacherClasses.map((cls) => `${cls.grade} ${cls.stream}`), [teacherClasses]);

  const { data: teacherStudentsCount = 0 } = useQuery({
    queryKey: ["teacher-student-count", teacherClassIds],
    queryFn: async () => {
      if (!teacherClassIds.length) return 0;
      const { count, error } = await supabase
        .from("learners")
        .select("id", { count: "exact", head: true })
        .in("class_id", teacherClassIds)
        .eq("status", "active");
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "teacher" && teacherClassIds.length > 0,
  });

  const { data: teacherAssessmentsWeek = 0 } = useQuery({
    queryKey: ["teacher-assessments-week", teacherClassIds, assessmentWeekDate],
    queryFn: async () => {
      if (!teacherClassIds.length) return 0;
      const { data: learnerIdsData, error: learnerError } = await supabase
        .from("learners")
        .select("id")
        .in("class_id", teacherClassIds);
      if (learnerError) throw learnerError;
      const learnerIds = (learnerIdsData || []).map((l) => l.id);
      if (learnerIds.length === 0) return 0;

      const { count, error } = await supabase
        .from("assessment_records")
        .select("id", { count: "exact", head: true })
        .in("learner_id", learnerIds)
        .gte("created_at", assessmentWeekDate);
      if (error) throw error;
      return count || 0;
    },
    enabled: user?.role === "teacher" && teacherClassIds.length > 0,
  });

  // ================= PARENT QUERIES =================
  const { data: parentAssessments = [] } = useStudentAssessmentRecords(
    user?.role === "parent" ? selectedChildId || undefined : undefined
  );

  const { data: parentPathwayAllocation = null } = useQuery({
    queryKey: ["parent-pathway-alloc", selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return null;
      const { data, error } = await supabase
        .from("pathway_allocations")
        .select("*")
        .eq("learner_id", selectedChildId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: user?.role === "parent" && !!selectedChildId,
  });

  // Performance calculations for school admin view
  const performanceStats = useMemo(() => {
    const breakdown = { exceeds: 0, meets: 0, approaches: 0, below: 0 };
    allAssessments.forEach((record) => {
      const val = String(record.rubric_score || "").toLowerCase();
      if (val === "exceeds" || val === "ee") breakdown.exceeds += 1;
      else if (val === "meets" || val === "me") breakdown.meets += 1;
      else if (val === "approaches" || val === "ae") breakdown.approaches += 1;
      else if (val === "below" || val === "be") breakdown.below += 1;
    });
    const total = breakdown.exceeds + breakdown.meets + breakdown.approaches + breakdown.below;
    const percent = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);
    return { breakdown, total, percent };
  }, [allAssessments]);

  // Performance mapping for parent view (latest score per subject)
  const latestBySubject = useMemo(() => {
    return parentAssessments.reduce((acc, record) => {
      const area = record.learning_area || "Other";
      if (!acc[area] || new Date(record.created_at) > new Date(acc[area].created_at)) {
        acc[area] = record;
      }
      return acc;
    }, {} as Record<string, typeof parentAssessments[0]>);
  }, [parentAssessments]);

  const latestPerformanceLabel = useMemo(() => {
    const items = Object.values(latestBySubject);
    if (items.length === 0) return "N/A";
    return items[0].rubric_score || "N/A";
  }, [latestBySubject]);

  // Greetings and labels helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${timeGreeting}, ${user?.name?.split(" ")[0] || "User"}`;
  };

  const getSubtitle = () => {
    switch (user?.role) {
      case "system_admin":
        return "Platform status console and onboarding dashboard.";
      case "admin":
        return schoolName ? `Overview of school progress at ${schoolName}.` : "Overview of school progress today.";
      case "teacher":
        return teacherClassLabels.length > 0
          ? `You teach in classes: ${teacherClassLabels.join(", ")}.`
          : "SBA tools and student grade logs.";
      case "parent":
        return "Longitudinal progress tracker for your child's competency pathways.";
      default:
        return "Welcome to SchoolBloom.";
    }
  };

  console.log("DASHBOARD_DIAGNOSTICS:", {
    role: user?.role,
    schoolId,
    schoolName,
    studentCount,
    classCount,
    teacherCount,
    parentCount,
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title font-display">{getGreeting()}</h1>
            <p className="page-subtitle">{getSubtitle()}</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-primary block">SchoolBloom Platform</span>
            <span className="text-xs text-muted-foreground">Academic Year {currentAcademicYear}</span>
          </div>
        </div>
      </div>

      {/* ================= SUPER ADMIN VIEW ================= */}
      {user?.role === "system_admin" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Schools</CardTitle>
                  <Building2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{platformStats?.totalSchools || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered schools system-wide</p>
                </CardContent>
              </Card>
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Learners</CardTitle>
                  <GraduationCap className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{platformStats?.totalLearners || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active learners platform-wide</p>
                </CardContent>
              </Card>
              <Card className="bg-card hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{platformStats?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Provisioned active accounts</p>
                </CardContent>
              </Card>
            </div>
          )}

          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-80 rounded-xl" />
              <Skeleton className="h-80 rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Schools by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Schools by Category</CardTitle>
                  <CardDescription>Distribution of schools registered on the platform</CardDescription>
                </CardHeader>
                <CardContent className="h-56 flex items-center justify-center">
                  {platformStats?.schoolsByCategory && platformStats.schoolsByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={platformStats.schoolsByCategory} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="category" type="category" width={100} axisLine={false} tickLine={false} className="text-xs text-muted-foreground" />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-muted-foreground">No category data available</span>
                  )}
                </CardContent>
              </Card>

              {/* Accounts per Role */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Accounts per Role</CardTitle>
                  <CardDescription>Breakdown of active platform accounts by user role</CardDescription>
                </CardHeader>
                <CardContent className="h-56 flex items-center justify-center">
                  {platformStats?.accountsByRole && platformStats.accountsByRole.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center justify-around w-full gap-4 px-2">
                      <div className="w-1/2 h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={platformStats.accountsByRole}
                              dataKey="count"
                              nameKey="role"
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={2}
                            >
                              {platformStats.accountsByRole.map((entry, index) => {
                                const colors = [
                                  "hsl(var(--primary))",
                                  "hsl(var(--accent))",
                                  "hsl(var(--muted-foreground))",
                                  "hsl(var(--border))"
                                ];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2.5 flex-1">
                        {platformStats.accountsByRole.map((entry, index) => {
                          const colors = [
                            "bg-primary",
                            "bg-accent",
                            "bg-muted-foreground",
                            "bg-border"
                          ];
                          return (
                            <div key={entry.role} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`} />
                                <span className="text-muted-foreground font-medium">{entry.role}</span>
                              </div>
                              <span className="font-bold text-foreground">{entry.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No role data available</span>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Registered Schools list (snapshot) */}
          <div className="bg-card rounded-xl border border-border/50 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display font-semibold text-foreground">Registered Schools Snapshot</h2>
                <p className="text-sm text-muted-foreground">Adoption overview and status of onboarding schools.</p>
              </div>
              <Badge variant="outline">Supabase Connected</Badge>
            </div>

            <div className="space-y-3">
              {systemSchools.length > 0 ? (
                systemSchools.slice(0, 6).map((school) => (
                  <div key={school.id} className="flex flex-col gap-2 rounded-xl border border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-card hover:bg-muted/10 transition-colors">
                    <div>
                      <p className="font-medium text-foreground">{school.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {school.code}
                        {(school.county || school.subcounty) &&
                          ` • ${[school.subcounty, school.county].filter(Boolean).join(", ")}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(school.school_categories || []).map((category: string) => (
                          <Badge key={category} variant="outline">
                            {category === "primary_junior_secondary" ? "PP1 to Grade 9" : "Grade 10 to 12"}
                          </Badge>
                        ))}
                        {school.category && (
                          <Badge variant="secondary">
                            {school.category === "Special_Needs" ? "Special Needs" : school.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No schools registered yet.</p>
              )}
            </div>
            <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
              <p className="font-medium text-foreground">Super Admin Access Level</p>
              <p className="text-sm text-muted-foreground">
                This console displays global telemetry across all tenant partitions. Access is strictly audited and limited to platform operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= SCHOOL ADMIN VIEW ================= */}
      {user?.role === "admin" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Students"
              value={studentCount}
              subtitle="Admitted and active"
              icon={Users}
              variant="primary"
            />
            <StatCard
              title="Assigned Classes"
              value={classCount}
              subtitle="Registered streams"
              icon={GraduationCap}
            />
            <StatCard
              title="Faculty Members"
              value={teacherCount}
              subtitle="Active teachers"
              icon={ShieldCheck}
              variant="success"
            />
            <StatCard
              title="Parents / Guardians"
              value={parentCount}
              subtitle="Registered households"
              icon={Users}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">CBC Performance Distribution</CardTitle>
                  <CardDescription>
                    Performance levels calculated across all recorded assessment rubrics.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-success/10 rounded-xl">
                      <p className="text-2xl font-bold text-success font-display">
                        {performanceStats.percent(performanceStats.breakdown.exceeds)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Exceeding Expectations</p>
                    </div>
                    <div className="text-center p-4 bg-primary/10 rounded-xl">
                      <p className="text-2xl font-bold text-primary font-display">
                        {performanceStats.percent(performanceStats.breakdown.meets)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Meeting Expectations</p>
                    </div>
                    <div className="text-center p-4 bg-warning/10 rounded-xl">
                      <p className="text-2xl font-bold text-warning font-display">
                        {performanceStats.percent(performanceStats.breakdown.approaches)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Approaching Expectations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <QuickActions />
              <RecentActivity role="admin" />
            </div>
          </div>
        </div>
      )}

      {/* ================= TEACHER VIEW ================= */}
      {user?.role === "teacher" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="My Assigned Classes"
              value={teacherClasses.length}
              subtitle={teacherClassLabels.join(", ") || "No classes assigned"}
              icon={GraduationCap}
              variant="primary"
            />
            <StatCard
              title="Active Students"
              value={teacherStudentsCount}
              subtitle="Enrolled under your classes"
              icon={Users}
              variant="success"
            />
            <StatCard
              title="Assessments Recorded"
              value={teacherAssessmentsWeek}
              subtitle="This week"
              icon={BookOpen}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Today's Class Schedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teacherClasses.length > 0 ? (
                    teacherClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30 border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9.5 h-9.5 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                            {cls.grade[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">Grade {cls.grade} • {cls.stream}</p>
                            <p className="text-xs text-muted-foreground">Subject instructions assigned</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                      No classes currently registered under your teaching profile.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <QuickActions />
              <RecentActivity role="teacher" classIds={teacherClassIds} teacherId={user.id} />
            </div>
          </div>
        </div>
      )}

      {/* ================= PARENT VIEW ================= */}
      {user?.role === "parent" && (
        <div className="space-y-6">
          {/* Child Selection Header */}
          {!selectedChildId ? (
            <Card className="border-dashed py-16 text-center">
              <CardContent>
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg">No Linked Children Found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                  We could not find any children registered under your parent account. Please contact the school administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Selected Child Info */}
              <div className="bg-card rounded-2xl border border-border/50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center font-bold text-lg text-primary">
                      {childInitials}
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-semibold text-foreground">
                        {selectedChild?.full_name || "Unknown"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedChild?.classes
                          ? `${selectedChild.classes.grade} • ${selectedChild.classes.stream}`
                          : "Grade unavailable"}{" "}
                        • Admission No: <strong className="font-mono">{selectedChild?.admission_number || "N/A"}</strong>
                      </p>
                    </div>
                  </div>
                  {user.children && user.children.length > 1 && (
                    <div className="w-56">
                      <Select
                        value={selectedChildId || ""}
                        onValueChange={(val) => setSelectedChildId(val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select child" />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Current Grade"
                  value={selectedChild?.classes ? `Grade ${selectedChild.classes.grade}` : "Unassigned"}
                  subtitle={selectedChild?.classes ? `Stream: ${selectedChild.classes.stream}` : "Awaiting class allocation"}
                  icon={GraduationCap}
                  variant="primary"
                />
                <StatCard
                  title="Competency Status"
                  value={latestPerformanceLabel}
                  subtitle="Latest assessment score"
                  icon={TrendingUp}
                  variant="default"
                />
                <StatCard
                  title="SSS Pathway Placement"
                  value={parentPathwayAllocation?.finalized ? parentPathwayAllocation.pathway : "Pending"}
                  subtitle={
                    parentPathwayAllocation?.finalized
                      ? `Finalized on ${new Date(parentPathwayAllocation.finalized_at).toLocaleDateString()}`
                      : "Evaluations ongoing"
                  }
                  icon={Route}
                  variant={parentPathwayAllocation?.finalized ? "success" : "default"}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Recent Assessments Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Competency Performance by Area</CardTitle>
                      <CardDescription>
                        Latest assessment remarks recorded per learning area.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3.5">
                      {Object.values(latestBySubject).length > 0 ? (
                        Object.values(latestBySubject).map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl">
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {record.learning_area || "Other"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {record.sub_strand_name || "Sub-strand remarks"}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className="text-xs">{record.rubric_score}</Badge>
                              {record.qualitative_notes && (
                                <p className="text-[11px] text-muted-foreground max-w-xs mt-1 truncate">
                                  {record.qualitative_notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                          No assessment grades logged for this student yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-6">
                  {/* Pathway Quick Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Confirmed SSS Placement</CardTitle>
                      <CardDescription>Transition to Grade 10 Senior Secondary</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {parentPathwayAllocation ? (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl border bg-success/5 border-success/20">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Confirmed Pathway</span>
                            <span className="font-bold text-success text-base flex items-center gap-1.5">
                              <Route className="w-4 h-4" />
                              {parentPathwayAllocation.pathway === "STEM"
                                ? "STEM Pathway"
                                : parentPathwayAllocation.pathway === "Social_Sciences"
                                ? "Social Sciences"
                                : "Arts & Sports"}
                            </span>
                          </div>
                          {parentPathwayAllocation.kjsea_score !== null && (
                            <div className="p-3.5 rounded-xl border bg-card">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">KJSEA Score</span>
                              <span className="font-bold text-foreground text-sm">{parentPathwayAllocation.kjsea_score}%</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-muted-foreground leading-relaxed border border-dashed rounded-xl px-2">
                          Evaluations for Senior Secondary Pathway are pending results finalization by the school.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
