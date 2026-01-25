import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, TrendingUp, Star, Eye, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAssessments, useCreateAssessment, useStudentAssessments, LEARNING_AREAS, PERFORMANCE_LEVELS } from "@/hooks/useAssessments";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useSubjectAssignments } from "@/hooks/useSubjects";

export default function Assessments() {
  const { user, selectedChildId, setSelectedChildId, hasPermission } = useRole();
  const canWrite = hasPermission("assessments:write");
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [learningArea, setLearningArea] = useState("");
  const [performanceLevel, setPerformanceLevel] = useState("");
  const [assessmentType, setAssessmentType] = useState("");
  const [strand, setStrand] = useState("");
  const [comments, setComments] = useState("");
  const selectedChild = user.children?.find((child) => child.id === selectedChildId);
  const childInitials = selectedChild?.full_name
    ? selectedChild.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "??";

  const { data: assessments, isLoading } = useAssessments();
  const { data: studentAssessments } = useStudentAssessments(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );
  const { data: classes } = useClasses();
  const { data: students } = useStudents();
  const { data: subjectAssignments = [] } = useSubjectAssignments();
  const createAssessment = useCreateAssessment();

  const getPerformanceCode = (level?: string | null) =>
    PERFORMANCE_LEVELS.find((item) => item.level === level)?.code || level || "N/A";
  const getPerformanceLabel = (level?: string | null) =>
    PERFORMANCE_LEVELS.find((item) => item.level === level)?.name || "Performance";

  const allowedClassIds = useMemo(() => {
    if (user.role !== "teacher") return null;

    return new Set(
      subjectAssignments
        .filter((assignment) => assignment.teacher_id === user.id)
        .map((assignment) => assignment.class_id)
    );
  }, [subjectAssignments, user.id, user.role]);

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    if (!allowedClassIds) return classes;
    return classes.filter((cls) => allowedClassIds.has(cls.id));
  }, [allowedClassIds, classes]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (allowedClassIds) {
      return students.filter((s) => allowedClassIds.has(s.class_id));
    }
    return students;
  }, [allowedClassIds, students]);

  const filteredStudentsByClass = filteredStudents.filter((s) => s.class_id === classId);

  const allowedLearningAreas = useMemo(() => {
    if (user.role !== "teacher") {
      return LEARNING_AREAS;
    }

    const assignedSubjectNames = subjectAssignments
      .filter((assignment) => assignment.teacher_id === user.id)
      .filter((assignment) => (classId ? assignment.class_id === classId : true))
      .map((assignment) => assignment.subject?.name)
      .filter(Boolean) as string[];

    const unique = Array.from(
      new Set(assignedSubjectNames.map((name) => name.trim()).filter(Boolean))
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [classId, subjectAssignments, user.id, user.role]);

  const learningAreaPlaceholder =
    user.role === "teacher"
      ? classId
        ? allowedLearningAreas.length > 0
          ? "Select learning area"
          : "No assigned learning areas"
        : "Select class first"
      : "Select learning area";

  useEffect(() => {
    if (!learningArea) return;
    if (!allowedLearningAreas.includes(learningArea)) {
      setLearningArea("");
    }
  }, [allowedLearningAreas, learningArea]);

  useEffect(() => {
    if (!classId) return;
    if (allowedClassIds && !allowedClassIds.has(classId)) {
      setClassId("");
      setStudentId("");
    }
  }, [allowedClassIds, classId]);

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite) return;
    if (user.role === "teacher" && !allowedLearningAreas.includes(learningArea)) {
      return;
    }

    const currentYear = new Date().getFullYear().toString();
    const currentTerm = 1;

    createAssessment.mutate(
      {
        student_id: studentId,
        class_id: classId,
        learning_area: learningArea,
        performance_level: performanceLevel,
        assessment_type: assessmentType,
        strand: strand || null,
        comments: comments || null,
        academic_year: currentYear,
        term: currentTerm,
        assessed_by: user.id,
      },
      {
        onSuccess: () => {
          setStudentId("");
          setLearningArea("");
          setPerformanceLevel("");
          setAssessmentType("");
          setStrand("");
          setComments("");
        },
      }
    );
  };

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
                      {getPerformanceCode(assessment.performance_level)}
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

      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Record Assessment</h3>
        <form onSubmit={handleSaveAssessment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Class</label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      Grade {cls.grade} {cls.stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Student</label>
              <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                <SelectTrigger>
                  <SelectValue placeholder={classId ? "Select student" : "Select class first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudentsByClass.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Learning Area</label>
              <Select
                value={learningArea}
                onValueChange={setLearningArea}
                disabled={user.role === "teacher" && (!classId || allowedLearningAreas.length === 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={learningAreaPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {allowedLearningAreas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Assessment Type</label>
              <Select value={assessmentType} onValueChange={setAssessmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Formative">Formative Assessment</SelectItem>
                  <SelectItem value="Summative">Summative Assessment</SelectItem>
                  <SelectItem value="Project">Project Based</SelectItem>
                  <SelectItem value="Portfolio">Portfolio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Performance Level</label>
              <Select value={performanceLevel} onValueChange={setPerformanceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_LEVELS.map((level) => (
                    <SelectItem key={level.level} value={level.level}>
                      {level.code} - {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Strand (Optional)</label>
              <Select value={strand} onValueChange={setStrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select strand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Numbers">Numbers</SelectItem>
                  <SelectItem value="Measurement">Measurement</SelectItem>
                  <SelectItem value="Geometry">Geometry</SelectItem>
                  <SelectItem value="Data Handling">Data Handling</SelectItem>
                  <SelectItem value="Algebra">Algebra</SelectItem>
                  <SelectItem value="Listening & Speaking">Listening & Speaking</SelectItem>
                  <SelectItem value="Reading">Reading</SelectItem>
                  <SelectItem value="Writing">Writing</SelectItem>
                  <SelectItem value="Grammar">Grammar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Comments</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Teacher's comments on student performance..."
              rows={3}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                !canWrite ||
                !studentId ||
                !learningArea ||
                !performanceLevel ||
                !assessmentType ||
                createAssessment.isPending
              }
            >
              {createAssessment.isPending ? "Saving..." : "Save Assessment"}
            </Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
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
                        {getPerformanceCode(assessment.performance_level)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAssessment(assessment)}
                        aria-label="View assessment details"
                        title="View assessment details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
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

      <Dialog open={!!selectedAssessment} onOpenChange={(open) => !open && setSelectedAssessment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assessment Details</DialogTitle>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Student</p>
                  <p className="font-medium text-foreground">
                    {selectedAssessment.student?.full_name || "Unknown"}
                  </p>
                </div>
                <Badge className={PERFORMANCE_LEVELS.find(p => p.level === selectedAssessment.performance_level)?.color}>
                  {getPerformanceCode(selectedAssessment.performance_level)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Learning Area</p>
                  <p className="font-medium text-foreground">{selectedAssessment.learning_area}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="font-medium text-foreground">{getPerformanceLabel(selectedAssessment.performance_level)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="font-medium text-foreground">
                    {selectedAssessment.class
                      ? `${selectedAssessment.class.grade} ${selectedAssessment.class.stream}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Assessment Type</p>
                  <p className="font-medium text-foreground">{selectedAssessment.assessment_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Strand</p>
                  <p className="font-medium text-foreground">{selectedAssessment.strand || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className="font-medium text-foreground">{selectedAssessment.score ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Term</p>
                  <p className="font-medium text-foreground">{selectedAssessment.term}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Academic Year</p>
                  <p className="font-medium text-foreground">{selectedAssessment.academic_year}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comments</p>
                <p className="text-foreground">{selectedAssessment.comments || "No comments"}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                Recorded on{" "}
                {selectedAssessment.created_at
                  ? new Date(selectedAssessment.created_at).toLocaleDateString("en-KE", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
