import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, GraduationCap, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAssignClassTeacher, useClassesWithStudentCount, useCreateClass } from "@/hooks/useClasses";
import { useTeachers } from "@/hooks/useTeachers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSchoolScope } from "@/hooks/useSchoolScope";

const classSchema = z.object({
  grade: z.string().min(1, "Please select a grade"),
  stream: z.string().min(1, "Stream is required"),
});

type ClassFormData = z.infer<typeof classSchema>;

function AddClassDialog({ grades }: { grades: string[] }) {
  const [open, setOpen] = useState(false);
  const createClass = useCreateClass();
  
  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: { grade: "", stream: "" },
  });

  const onSubmit = (data: ClassFormData) => {
    createClass.mutate({ grade: data.grade, stream: data.stream }, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
          <DialogDescription>Create a new class for the academic year.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stream"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stream *</FormLabel>
                  <FormControl>
                    <Input placeholder="A, B, East, West..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createClass.isPending}>
                {createClass.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Class
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Classes() {
  const { user } = useAuth();
  const { allowedGrades, gradeBandLabel } = useSchoolScope();
  const { data: classes = [], isLoading } = useClassesWithStudentCount();
  const { data: teachers = [] } = useTeachers();
  const assignTeacher = useAssignClassTeacher();
  
  const canWrite = user?.role === "admin";

  const teacherMap = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher.full_name])),
    [teachers]
  );
  const visibleClasses = classes.filter((cls) => allowedGrades.includes(cls.grade));
  const groupedClasses = visibleClasses.reduce((acc, cls) => {
    if (!acc[cls.grade]) acc[cls.grade] = [];
    acc[cls.grade].push(cls);
    return acc;
  }, {} as Record<string, typeof classes>);
  const totalStudents = visibleClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Classes</h1>
            <p className="page-subtitle">Academic structure for {gradeBandLabel}</p>
          </div>
          {canWrite && <AddClassDialog grades={allowedGrades} />}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{visibleClasses.length}</p>
            <p className="text-sm text-muted-foreground">Total Classes</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{totalStudents}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{allowedGrades.length}</p>
            <p className="text-sm text-muted-foreground">Grade Levels</p>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : visibleClasses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
          No classes created yet. Add your first class!
        </div>
      ) : (
        <div className="space-y-6">
          {allowedGrades.map((grade) => {
            const gradeClasses = groupedClasses[grade];
            if (!gradeClasses || gradeClasses.length === 0) return null;
            
            return (
              <div key={grade} className="bg-card rounded-xl border border-border/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{grade}</h3>
                    <p className="text-xs text-muted-foreground">
                      {gradeClasses.length} stream{gradeClasses.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {gradeClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors cursor-pointer"
                    >
                      <p className="font-medium text-foreground">{cls.stream}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{cls.student_count || 0} students</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Teacher: {cls.teacher_id ? teacherMap.get(cls.teacher_id) || "Unknown" : "Unassigned"}
                      </div>
                      {canWrite && (
                        <div className="mt-2">
                          <Select
                            value={cls.teacher_id || "unassigned"}
                            onValueChange={(value) =>
                              assignTeacher.mutate({
                                classId: cls.id,
                                teacherId: value === "unassigned" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Assign teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
