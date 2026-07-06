import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, Star, Eye, Loader2, ArrowRight } from "lucide-react";
import { KNECExportButton } from "@/components/ui/ExportButtons";
import { CompetencyRadarChart, QualitativeNotesDisplay } from "@/components/ui/CompetencyRadarChart";
import { useEffect, useMemo, useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import {
  useAssessmentRecords,
  useCreateAssessmentRecord,
  useStudentAssessmentRecords,
  getLearningAreasForCategories,
  PERFORMANCE_LEVELS,
} from "@/hooks/useAssessments";
import { useClasses } from "@/hooks/useClasses";
import { useLearners } from "@/hooks/useLearners";
import { useSubjectAssignments } from "@/hooks/useSubjects";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useCurrentTeacherId } from "@/hooks/useTeachers";
import { SBAIngestionTab } from "@/components/assessments/SBAIngestionTab";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const rubricScores = [
  { value: "Exceeds", label: "Exceeds Expectations (EE)", color: "bg-success text-success-foreground" },
  { value: "Meets", label: "Meets Expectations (ME)", color: "bg-primary text-primary-foreground" },
  { value: "Approaches", label: "Approaches Expectations (AE)", color: "bg-warning text-warning-foreground" },
  { value: "Below", label: "Below Expectations (BE)", color: "bg-destructive text-destructive-foreground" },
];

export default function Assessments() {
  const { user, selectedChildId, setSelectedChildId, hasPermission } = useRole();
  const canWrite = hasPermission("assessments:write");
  const isAdmin = user.role === "admin";
  const { categories } = useSchoolScope();
  const queryClient = useQueryClient();

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  
  // Form states
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [learningArea, setLearningArea] = useState("");
  const [strandName, setStrandName] = useState("");
  const [subStrandName, setSubStrandName] = useState("");
  const [rubricScore, setRubricScore] = useState<any>("");
  const [qualitativeNotes, setQualitativeNotes] = useState("");
  const [coreCompetencyNotes, setCoreCompetencyNotes] = useState("");
  const [valuesNotes, setValuesNotes] = useState("");

  const selectedChild = user.children?.find((child) => child.id === selectedChildId);
  const childInitials = selectedChild?.full_name
    ? selectedChild.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)
    : "??";

  // Data fetching queries
  const { data: assessmentRecords = [], isLoading } = useAssessmentRecords(classId || undefined);
  const { data: studentRecords = [] } = useStudentAssessmentRecords(
    user.role === "parent" ? selectedChildId || undefined : undefined
  );
  
  const { data: classes = [] } = useClasses();
  const { data: students = [] } = useLearners();
  const { data: subjectAssignments = [] } = useSubjectAssignments();

  const createRecord = useCreateAssessmentRecord();
  const { data: teacherRecordId } = useCurrentTeacherId();

  // Parent Portal Realtime subscription
  useEffect(() => {
    if (user.role !== "parent" || !selectedChildId) return;

    const channel = supabase
      .channel(`parent-assessment-records-${selectedChildId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "assessment_records",
          filter: `learner_id=eq.${selectedChildId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["student-assessment-records", selectedChildId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChildId, user.role, queryClient]);

  const getRubricBadgeColor = (score?: string) => {
    return rubricScores.find((r) => r.value === score)?.color || "bg-muted text-muted-foreground";
  };

  const allowedClassIds = useMemo(() => {
    if (user.role !== "teacher") return null;

    return new Set(
      subjectAssignments
        .filter((assignment) => assignment.teacher_id === teacherRecordId)
        .map((assignment) => assignment.class_id)
    );
  }, [subjectAssignments, teacherRecordId, user.role]);

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
      return getLearningAreasForCategories(categories).sort((a, b) => a.localeCompare(b));
    }

    const assignedSubjectNames = subjectAssignments
      .filter((assignment) => assignment.teacher_id === teacherRecordId)
      .filter((assignment) => (classId ? assignment.class_id === classId : true))
      .map((assignment) => assignment.subject?.name)
      .filter(Boolean) as string[];

    const unique = Array.from(
      new Set(assignedSubjectNames.map((name) => name.trim()).filter(Boolean))
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [categories, classId, subjectAssignments, teacherRecordId, user.role]);

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

  // Reset strand and sub-strand when learning area changes
  useEffect(() => {
    setStrandName("");
    setSubStrandName("");
  }, [learningArea]);

  // Reset sub-strand when strand changes
  useEffect(() => {
    setSubStrandName("");
  }, [strandName]);

  const handleSaveAssessment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite) return;
    if (!studentId || !learningArea || !strandName || !subStrandName || !rubricScore || !term || !year) {
      return;
    }

    createRecord.mutate(
      {
        learner_id: studentId,
        strand_name: strandName,
        sub_strand_name: subStrandName,
        learning_area: learningArea,
        teacher_id: user.id,  // Will be resolved to teachers.id in the hook
        term: parseInt(term),
        year,
        rubric_score: rubricScore,
        qualitative_notes: qualitativeNotes || null,
        core_competency_notes: coreCompetencyNotes || null,
        values_notes: valuesNotes || null,
      },
      {
        onSuccess: () => {
          setStudentId("");
          setLearningArea("");
          setStrandName("");
          setSubStrandName("");
          setRubricScore("");
          setQualitativeNotes("");
          setCoreCompetencyNotes("");
          setValuesNotes("");
        },
      }
    );
  };

  // Parent view
  if (user.role === "parent") {
    // Group assessments by learning area (most recent for each)
    const latestBySubject = studentRecords.reduce((acc, record) => {
      const area = record.learning_area || "Other";
      if (!acc[area] || new Date(record.created_at) > new Date(acc[area].created_at)) {
        acc[area] = record;
      }
      return acc;
    }, {} as Record<string, typeof studentRecords[0]>);

    const handleExportCSV = () => {
      if (!studentRecords || studentRecords.length === 0) {
        toast.error("No assessment records found to export.");
        return;
      }

      // Headers matching format expected by SBA Ingestion
      const headers = [
        "admission_number",
        "strand_code",
        "sub_strand_code",
        "term",
        "year",
        "rubric_score",
        "qualitative_notes",
        "core_competency_notes",
        "values_notes"
      ];

      const csvRows = [
        headers.join(","),
        ...studentRecords.map((record) => {
          const row = [
            selectedChild?.admission_number || "",
            record.strand_name || "",
            record.sub_strand_name || "",
            record.term || "",
            record.year || "",
            record.rubric_score || "",
            record.qualitative_notes || "",
            record.core_competency_notes || "",
            record.values_notes || ""
          ];
          return row
            .map((val) => {
              const str = String(val).replace(/"/g, '""');
              return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
            })
            .join(",");
        }),
      ];

      const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel compatibility
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const childName = selectedChild?.full_name?.replace(/\s+/g, "_") || "student";
      link.setAttribute("href", url);
      link.setAttribute("download", `${childName}_SBA_History_Transfer.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Assessment history exported successfully");
    };

    return (
      <DashboardLayout>
        <div className="page-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title font-display">Academic Progress</h1>
              <p className="page-subtitle">View your child's CBC assessment results</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleExportCSV} className="gap-2" variant="outline">
                <FileText className="w-4 h-4" /> Export SBA History (Transfer CSV)
              </Button>
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
            {rubricScores.map((level) => (
              <div key={level.value} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className={level.color}>{level.value}</Badge>
                <span className="text-sm text-foreground">{level.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core Competency Radar Chart */}
        {Object.values(latestBySubject).length > 0 && (
          <div className="mb-6">
            <CompetencyRadarChart
              data={Object.values(latestBySubject).map((a) => ({
                subject: a.learning_area || "Other",
                level: (a.rubric_score || "").toLowerCase(),
              }))}
            />
          </div>
        )}

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Assessment Results</h3>
          </div>
          <div className="divide-y divide-border">
            {Object.values(latestBySubject).length > 0 ? (
              Object.values(latestBySubject).map((record) => (
                <div key={record.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="space-y-1">
                      <span className="font-medium text-foreground">{record.learning_area}</span>
                      <p className="text-xs text-muted-foreground">
                        {record.strand_name} <ArrowRight className="inline w-3 h-3" /> {record.sub_strand_name}
                      </p>
                    </div>
                    <Badge className={getRubricBadgeColor(record.rubric_score)}>
                      {record.rubric_score}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{record.qualitative_notes || "No comments"}</p>
                  {(record.core_competency_notes || record.values_notes) && (
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {record.core_competency_notes && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Core Competencies:</span> {record.core_competency_notes}
                        </p>
                      )}
                      {record.values_notes && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">CBC Values:</span> {record.values_notes}
                        </p>
                      )}
                    </div>
                  )}
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

  // Admin/Teacher Tabbed content
  const renderAssessmentForm = () => (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border/50 p-5">
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
              <label className="text-sm font-medium text-foreground">Strand</label>
              <Input
                value={strandName}
                onChange={(e) => setStrandName(e.target.value)}
                placeholder="Enter strand name"
                disabled={!learningArea}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sub-Strand</label>
              <Input
                value={subStrandName}
                onChange={(e) => setSubStrandName(e.target.value)}
                placeholder="Enter sub-strand name"
                disabled={!strandName}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Rubric Score</label>
              <Select value={rubricScore} onValueChange={setRubricScore} disabled={!subStrandName}>
                <SelectTrigger>
                  <SelectValue placeholder={subStrandName ? "Select rating" : "Enter sub-strand first"} />
                </SelectTrigger>
                <SelectContent>
                  {rubricScores.map((score) => (
                    <SelectItem key={score.value} value={score.value}>
                      {score.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Term</label>
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
              <label className="text-sm font-medium text-foreground">Academic Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Qualitative Notes / Performance Remarks</label>
              <textarea
                value={qualitativeNotes}
                onChange={(e) => setQualitativeNotes(e.target.value)}
                placeholder="Specific comments on student performance..."
                rows={3}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Core Competency remarks</label>
              <textarea
                value={coreCompetencyNotes}
                onChange={(e) => setCoreCompetencyNotes(e.target.value)}
                placeholder="Critical thinking, communication, collaboration observations..."
                rows={3}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">CBC Values remarks</label>
              <textarea
                value={valuesNotes}
                onChange={(e) => setValuesNotes(e.target.value)}
                placeholder="Patriotism, integrity, respect, responsibility indicators..."
                rows={3}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={
                !canWrite ||
                !studentId ||
                !learningArea ||
                !strandName ||
                !subStrandName ||
                !rubricScore ||
                createRecord.isPending
              }
            >
              {createRecord.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Assessment"
              )}
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Recent Assessments</h3>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : assessmentRecords && assessmentRecords.length > 0 ? (
          <div className="divide-y divide-border">
            {assessmentRecords.slice(0, 10).map((record: any) => (
              <div key={record.id} className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {record.learner?.full_name || "Unknown"} - {record.learning_area}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {record.strand_name} <ArrowRight className="inline w-3 h-3 text-muted-foreground" /> {record.sub_strand_name} • Year {record.year} Term {record.term}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRubricBadgeColor(record.rubric_score)}>
                    {record.rubric_score}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRecord(record)}
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
            No assessments recorded yet for this class selection.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">CBC Assessments</h1>
            <p className="page-subtitle">Record and track learner longitudinal progress</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <KNECExportButton />
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />CBC Performance Levels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rubricScores.map((level) => (
            <div key={level.value} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge className={level.color}>{level.value}</Badge>
              <span className="text-foreground text-xs sm:text-sm">{level.label.split(" (")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
            <TabsTrigger value="record">Record Assessment</TabsTrigger>
            <TabsTrigger value="ingest">SBA CSV Ingestion</TabsTrigger>
          </TabsList>
          <TabsContent value="record" className="mt-0">
            {renderAssessmentForm()}
          </TabsContent>
          <TabsContent value="ingest" className="mt-0">
            <SBAIngestionTab />
          </TabsContent>
        </Tabs>
      ) : (
        renderAssessmentForm()
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Continuous Assessment Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Learner</p>
                  <p className="font-medium text-foreground">
                    {selectedRecord.learner?.full_name || "Unknown"}
                  </p>
                </div>
                <Badge className={getRubricBadgeColor(selectedRecord.rubric_score)}>
                  {selectedRecord.rubric_score}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Learning Area</p>
                  <p className="font-medium text-foreground">{selectedRecord.learning_area}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Strand</p>
                  <p className="font-medium text-foreground">{selectedRecord.strand_name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Sub-Strand</p>
                  <p className="font-medium text-foreground">{selectedRecord.sub_strand_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Term & Year</p>
                  <p className="font-medium text-foreground">Term {selectedRecord.term}, {selectedRecord.year}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recorded By</p>
                  <p className="font-medium text-foreground">Teacher</p>
                </div>
              </div>
              
              <div className="border-t pt-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Qualitative Notes / Performance Remarks</p>
                  <p className="text-foreground mt-1 bg-muted/30 p-2.5 rounded-lg border border-border/20">{selectedRecord.qualitative_notes || "No remarks"}</p>
                </div>
                {selectedRecord.core_competency_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Core Competencies remarks</p>
                    <p className="text-foreground mt-1 bg-muted/30 p-2.5 rounded-lg border border-border/20">{selectedRecord.core_competency_notes}</p>
                  </div>
                )}
                {selectedRecord.values_notes && (
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">CBC Values remarks</p>
                    <p className="text-foreground mt-1 bg-muted/30 p-2.5 rounded-lg border border-border/20">{selectedRecord.values_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
