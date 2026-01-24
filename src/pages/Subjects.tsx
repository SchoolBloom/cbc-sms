import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  useCreateSubject,
  useCreateSubjectAssignment,
  useDeleteSubjectAssignment,
  useSubjectAssignments,
  useSubjects,
} from "@/hooks/useSubjects";

export default function Subjects() {
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

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

  const createSubject = useCreateSubject();
  const createAssignment = useCreateSubjectAssignment();
  const deleteAssignment = useDeleteSubjectAssignment();

  const assignmentsBySubject = useMemo(() => {
    const map = new Map<string, number>();
    assignments.forEach((assignment) => {
      map.set(assignment.subject_id, (map.get(assignment.subject_id) || 0) + 1);
    });
    return map;
  }, [assignments]);

  const handleAddSubject = () => {
    if (!subjectName.trim()) return;
    createSubject.mutate({ name: subjectName, code: subjectCode });
    setSubjectName("");
    setSubjectCode("");
  };

  const handleAssign = () => {
    if (!selectedSubjectId || !selectedClassId || !selectedTeacherId) return;
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
          <h1 className="page-title font-display">Subjects</h1>
          <p className="page-subtitle">Manage subjects and assign teachers to classes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Add Subject</h2>
            </div>
            <div className="space-y-3">
              <Input
                placeholder="Subject name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              />
              <Input
                placeholder="Code (optional)"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
              />
              <Button
                className="w-full gap-2"
                onClick={handleAddSubject}
                disabled={!subjectName.trim() || createSubject.isPending}
              >
                {createSubject.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Add Subject
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">Subjects</h2>
            {subjectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects yet.</p>
            ) : (
              <div className="space-y-3">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{subject.name}</p>
                      {subject.code && (
                        <p className="text-xs text-muted-foreground">Code: {subject.code}</p>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {assignmentsBySubject.get(subject.id) || 0} assignments
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground">Assign Subject</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
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
          </div>

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
