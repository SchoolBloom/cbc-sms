import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Link2Off, Loader2, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTeachers } from "@/hooks/useTeachers";
import {
  useCreateSubjectAssignment,
  useDeleteSubjectAssignment,
  useSubjectAssignments,
  useSubjects,
} from "@/hooks/useSubjects";
import { LEARNING_AREAS_BY_LEVEL, getLearningAreasForCategories } from "@/hooks/useAssessments";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { filterSubjectsByPathway, getSubjectsForPathway, validateSubjectPathway } from "@/lib/pathwaySubjects";
import { toast } from "sonner";

export default function Assignments() {
  const { categories, supportsPrimaryJunior, supportsSenior, gradeBandLabel } = useSchoolScope();
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [pathwayWarning, setPathwayWarning] = useState<string | null>(null);

  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects();
  const { data: assignments = [], isLoading: assignmentsLoading } = useSubjectAssignments();
  const { data: teachers = [], isLoading: teachersLoading } = useTeachers();

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, grade, stream")
        .order("grade")
        .order("stream");

      if (error) throw error;
      return data || [];
    },
  });

  const createAssignment = useCreateSubjectAssignment();
  const deleteAssignment = useDeleteSubjectAssignment();

  const catalogueLearningAreas = useMemo(
    () => getLearningAreasForCategories(categories),
    [categories]
  );

  const catalogueSubjects = useMemo(() => {
    const subjectByName = new Map(subjects.map((subject) => [subject.name, subject]));
    return catalogueLearningAreas.map((name) => subjectByName.get(name)).filter(
      (subject): subject is (typeof subjects)[number] => Boolean(subject)
    );
  }, [catalogueLearningAreas, subjects]);

  // Get the selected class's grade to check for pathway filtering
  const selectedClass = useMemo(() => {
    return classes.find((cls) => cls.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Get students in the selected class to check their pathway
  const { data: classStudents = [] } = useQuery({
    queryKey: ["class-students-pathway", selectedClassId],
    queryFn: async () => {
      if (!selectedClassId) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, senior_pathway")
        .eq("class_id", selectedClassId)
        .not("senior_pathway", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(selectedClassId),
  });

  // Determine the pathway for the selected class (majority pathway)
  const classPathway = useMemo(() => {
    if (classStudents.length === 0) return null;
    const pathwayCounts = classStudents.reduce((acc, student) => {
      if (student.senior_pathway) {
        acc[student.senior_pathway] = (acc[student.senior_pathway] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const dominantPathway = Object.entries(pathwayCounts).sort((a, b) => b[1] - a[1])[0];
    return dominantPathway ? dominantPathway[0] : null;
  }, [classStudents]);

  // Filter subjects based on pathway for senior secondary classes
  const filteredCatalogueSubjects = useMemo(() => {
    if (!classPathway) return catalogueSubjects;
    return filterSubjectsByPathway(catalogueSubjects, classPathway);
  }, [catalogueSubjects, classPathway]);

  // Show warning when subjects are filtered by pathway
  useEffect(() => {
    if (classPathway && filteredCatalogueSubjects.length < catalogueSubjects.length) {
      const availableSubjects = getSubjectsForPathway(classPathway);
      setPathwayWarning(
        `Showing only ${classPathway} pathway subjects for this class. ${catalogueSubjects.length - filteredCatalogueSubjects.length} subjects hidden.`
      );
    } else {
      setPathwayWarning(null);
    }
  }, [classPathway, filteredCatalogueSubjects, catalogueSubjects]);

  const learningAreaGroups = [
    ...(supportsPrimaryJunior
      ? [
        { title: "Pre-Primary (PP1 & PP2)", items: LEARNING_AREAS_BY_LEVEL.prePrimary },
        { title: "Lower Primary (Grades 1–3)", items: LEARNING_AREAS_BY_LEVEL.lowerPrimary },
        { title: "Upper Primary (Grades 4–6)", items: LEARNING_AREAS_BY_LEVEL.upperPrimary },
        { title: "Junior Secondary (Grades 7–9)", items: LEARNING_AREAS_BY_LEVEL.juniorSecondary },
      ]
      : []),
    ...(supportsSenior
      ? [
          { title: "Senior Secondary Core", items: LEARNING_AREAS_BY_LEVEL.seniorSecondaryCore },
          { title: "STEM Pathway", items: LEARNING_AREAS_BY_LEVEL.seniorSecondaryStem },
          { title: "Social Sciences Pathway", items: LEARNING_AREAS_BY_LEVEL.seniorSecondarySocialSciences },
          { title: "Arts and Sports Pathway", items: LEARNING_AREAS_BY_LEVEL.seniorSecondaryArtsSports },
        ]
      : []),
  ];

  useEffect(() => {
    if (!selectedSubjectId) return;
    const isValid = catalogueSubjects.some((subject) => subject.id === selectedSubjectId);
    if (!isValid) setSelectedSubjectId("");
  }, [catalogueSubjects, selectedSubjectId]);

  const handleAssign = () => {
    if (!selectedSubjectId || !selectedClassId || !selectedTeacherId) return;
    
    // Get the subject name
    const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
    if (!selectedSubject) return;

    // Validate pathway if class has senior secondary students
    if (classPathway) {
      const validation = validateSubjectPathway(selectedSubject.name, classPathway, selectedClass?.grade);
      if (!validation.valid) {
        toast.error(validation.message);
        return;
      }
    }

    createAssignment.mutate({
      subjectId: selectedSubjectId,
      classId: selectedClassId,
      teacherId: selectedTeacherId,
    });
    setSelectedSubjectId("");
    setSelectedClassId("");
    setSelectedTeacherId("");
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title font-display">Assignments</h1>
          <p className="page-subtitle">Assign learning areas to classes and teachers for {gradeBandLabel}</p>
        </div>
      </div>

      {/* Pathway filtering warning */}
      {pathwayWarning && (
        <div className="bg-warning/10 border border-warning/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-warning-foreground">{pathwayWarning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground">Assign Learning Area</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={subjectsLoading ? "Loading subjects..." : "Select learning area"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCatalogueSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.grade} {cls.stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.user_id} value={teacher.user_id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="gap-2"
              onClick={handleAssign}
              disabled={
                !selectedSubjectId ||
                !selectedClassId ||
                !selectedTeacherId ||
                createAssignment.isPending
              }
            >
              {createAssignment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Assign
                </>
              )}
            </Button>
            {(classesLoading || teachersLoading) && (
              <p className="text-xs text-muted-foreground">
                Loading teachers and classes...
              </p>
            )}
            {!subjectsLoading && catalogueSubjects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No learning areas are available for this school's category catalogue.
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Learning Areas</h2>
            </div>
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {learningAreaGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="space-y-2">
                    {group.items.map((area) => (
                      <div
                        key={area}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm text-foreground">{area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {learningAreaGroups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No learning area catalogue is configured for this school category yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-display font-semibold text-foreground">Assignments</h3>
            </div>
            {assignmentsLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No assignments yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {assignment.subject?.name || "Subject"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.class
                          ? `${assignment.class.grade} ${assignment.class.stream}`
                          : "Class"}{" "}
                        • {assignment.teacher?.full_name || "Teacher"}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-destructive">
                          <Link2Off className="w-4 h-4" />
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove assignment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will unassign the subject from the teacher and class.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteAssignment.mutate(assignment.id)}
                            disabled={deleteAssignment.isPending}
                          >
                            {deleteAssignment.isPending ? "Removing..." : "Remove"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
