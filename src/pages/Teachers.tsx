import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Mail, Users, Loader2, MoreHorizontal, Eye, Trash2, ArrowLeftRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAuth } from "@/contexts/AuthContext";
import { useDeleteTeacher, useTeachers, useTransferTeacher, Teacher } from "@/hooks/useTeachers";
import { AddTeacherDialog } from "@/components/teachers/AddTeacherDialog";
import { TeacherProfileDialog } from "@/components/teachers/TeacherProfileDialog";

export default function Teachers() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);

  const { data: teachers = [], isLoading, error } = useTeachers();
  const deleteTeacher = useDeleteTeacher();
  const transferTeacher = useTransferTeacher();
  const canWrite = user?.role === "admin";
  const { data: classAssignments = [] } = useQuery({
    queryKey: ["teacher-class-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, grade, stream, teacher_id")
        .not("teacher_id", "is", null);

      if (error) throw error;
      return data || [];
    },
  });
  const { data: subjectAssignments = [] } = useQuery({
    queryKey: ["teacher-subject-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_assignments")
        .select("id, teacher_id, subjects(name), classes(grade, stream)")
        .not("teacher_id", "is", null);

      if (error) throw error;
      return data || [];
    },
  });
  const classesByTeacher = useMemo(() => {
    const map = new Map<string, string[]>();
    classAssignments.forEach((row) => {
      if (!row.teacher_id) return;
      const label = `${row.grade} ${row.stream}`;
      const existing = map.get(row.teacher_id) || [];
      existing.push(label);
      map.set(row.teacher_id, existing);
    });
    return map;
  }, [classAssignments]);
  const subjectsByTeacher = useMemo(() => {
    const map = new Map<string, string[]>();
    subjectAssignments.forEach((row) => {
      if (!row.teacher_id) return;
      const subjectName = row.subjects?.name || "Subject";
      const classLabel = row.classes ? `${row.classes.grade} ${row.classes.stream}` : "";
      const label = classLabel ? `${subjectName} (${classLabel})` : subjectName;
      const existing = map.get(row.teacher_id) || [];
      existing.push(label);
      map.set(row.teacher_id, existing);
    });
    return map;
  }, [subjectAssignments]);

  const filteredTeachers = teachers.filter((teacher) => {
    const query = searchQuery.toLowerCase();
    return (
      teacher.full_name.toLowerCase().includes(query) ||
      (teacher.email || "").toLowerCase().includes(query) ||
      (teacher.phone || "").includes(query)
    );
  });

  const teachersWithEmail = teachers.filter((t) => t.email).length;
  const emailPercentage = teachers.length > 0 ? Math.round((teachersWithEmail / teachers.length) * 100) : 0;
  const teachersWithPhone = teachers.filter((t) => t.phone).length;
  const phonePercentage = teachers.length > 0 ? Math.round((teachersWithPhone / teachers.length) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Teachers</h1>
            <p className="page-subtitle">Manage teacher accounts and contacts</p>
          </div>
          {canWrite && <AddTeacherDialog />}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{teachers.length}</p>
            <p className="text-sm text-muted-foreground">Total Teachers</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Phone className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{phonePercentage}%</p>
            <p className="text-sm text-muted-foreground">With Phone</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{emailPercentage}%</p>
            <p className="text-sm text-muted-foreground">With Email</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers by name, email, or phone..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Failed to load teachers. Please try again.
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
          {teachers.length === 0 ? "No teachers added yet. Add your first teacher!" : "No teachers match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-foreground">{teacher.full_name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => setViewTeacher(teacher)}>
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        {canWrite && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="gap-2 text-destructive focus:text-destructive"
                                onSelect={(event) => event.preventDefault()}
                              >
                                <Trash2 className="w-4 h-4" /> Remove Teacher
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove teacher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes the Teacher role from {teacher.full_name}. They will no longer appear in
                                  the teachers list.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTeacher.mutate(teacher.user_id)}
                                  disabled={deleteTeacher.isPending}
                                >
                                  {deleteTeacher.isPending ? "Removing..." : "Remove"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {canWrite && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="gap-2"
                                onSelect={(event) => event.preventDefault()}
                              >
                                <ArrowLeftRight className="w-4 h-4" /> Transfer
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Transfer teacher?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This unassigns {teacher.full_name} from classes and removes their Teacher role.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => transferTeacher.mutate(teacher.user_id)}
                                  disabled={transferTeacher.isPending}
                                >
                                  {transferTeacher.isPending ? "Transferring..." : "Transfer"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {teacher.phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.email && (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">{teacher.email}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Classes: {classesByTeacher.get(teacher.user_id)?.join(", ") || "Unassigned"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Subjects: {subjectsByTeacher.get(teacher.user_id)?.join(", ") || "Unassigned"}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Phone className="w-3 h-3" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Mail className="w-3 h-3" />
                  Message
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Badge variant="secondary" className="text-xs">
                  Teacher
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <TeacherProfileDialog
        teacher={viewTeacher}
        open={!!viewTeacher}
        onOpenChange={(open) => !open && setViewTeacher(null)}
        classes={viewTeacher ? classesByTeacher.get(viewTeacher.user_id) || [] : []}
        subjects={viewTeacher ? subjectsByTeacher.get(viewTeacher.user_id) || [] : []}
      />
    </DashboardLayout>
  );
}
