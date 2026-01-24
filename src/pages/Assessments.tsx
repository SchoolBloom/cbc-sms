import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Star, Eye, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAssessments, useStudentAssessments, LEARNING_AREAS, PERFORMANCE_LEVELS } from "@/hooks/useAssessments";
import { AddAssessmentDialog } from "@/components/assessments/AddAssessmentDialog";

export default function Assessments() {
  const { user, selectedChildId, setSelectedChildId, hasPermission } = useRole();
  const canWrite = hasPermission("assessments:write");
  const selectedChild = user.children?.find((child) => child.id === selectedChildId);
  const childInitials = selectedChild?.full_name
    ? selectedChild.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "??";

  const { data: assessments, isLoading } = useAssessments();
  const { data: studentAssessments } = useStudentAssessments(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );

  // Parent view
  if (user.role === "parent") {
    // Group assessments by learning area (most recent for each)
    const latestBySubject = studentAssessments?.reduce((acc, assessment) => {
      if (!acc[assessment.learning_area] || new Date(assessment.created_at) > new Date(acc[assessment.learning_area].created_at)) {
        acc[assessment.learning_area] = assessment;
      }
      return acc;
    }, {} as Record<string, typeof studentAssessments[0]>) || {};

    return (
      <DashboardLayout>
        <div className="page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title font-display">Academic Progress</h1>
              <p className="page-subtitle">View your child's CBC assessment results</p>
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

        <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{childInitials}</span>
            </div>
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
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />CBC Performance Levels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PERFORMANCE_LEVELS.map((level) => (
              <div key={level.level} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className={level.color}>{level.level}</Badge>
                <span className="text-sm text-foreground">{level.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Assessment Results</h3>
          </div>
          <div className="divide-y divide-border">
            {Object.values(latestBySubject).length > 0 ? (
              Object.values(latestBySubject).map((assessment) => (
                <div key={assessment.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{assessment.learning_area}</span>
                    <Badge className={PERFORMANCE_LEVELS.find(p => p.level === assessment.performance_level)?.color}>
                      {assessment.performance_level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{assessment.comments || "No comments"}</p>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-muted-foreground">
                No assessments recorded yet
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin/Teacher view
  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">CBC Assessments</h1>
            <p className="page-subtitle">{canWrite ? "Record and track student performance" : "View assessment records"}</p>
          </div>
          {canWrite && <AddAssessmentDialog />}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />CBC Performance Levels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERFORMANCE_LEVELS.map((level) => (
            <div key={level.level} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge className={level.color}>{level.level}</Badge>
              <span className="text-sm text-foreground">{level.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Learning Areas</h3>
            <div className="space-y-2">
              {LEARNING_AREAS.map((area) => (
                <div key={area} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{area}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Recent Assessments</h3>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : assessments && assessments.length > 0 ? (
              <div className="divide-y divide-border">
                {assessments.slice(0, 10).map((assessment: any) => (
                  <div key={assessment.id} className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">
                          {assessment.student?.full_name || "Unknown"} - {assessment.learning_area}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Grade {assessment.class?.grade} {assessment.class?.stream} • {assessment.assessment_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={PERFORMANCE_LEVELS.find(p => p.level === assessment.performance_level)?.color}>
                        {assessment.performance_level}
                      </Badge>
                      <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                No assessments recorded yet. Click "New Assessment" to add one.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
