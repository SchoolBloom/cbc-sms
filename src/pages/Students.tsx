import { useEffect, useMemo, useState } from "react";
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
import { Search, Filter, Download, MoreHorizontal, Eye, Edit, Trash2, FileText, Loader2, ArrowLeftRight } from "lucide-react";
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
import { useStudents, useUpdateStudentStatus } from "@/hooks/useStudents";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  transferred: "bg-muted text-muted-foreground border-muted",
  completed: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Students() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  
  const { data: students = [], isLoading, error } = useStudents();
  const updateStudentStatus = useUpdateStudentStatus();
  
  const canWrite = user?.role === "admin";
  const canDelete = user?.role === "admin";

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "all" || student.classes?.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });
  const grade9CompletionIds = useMemo(
    () =>
      students
        .filter(
          (student) =>
            student.classes?.grade === "Grade 9" &&
            student.status === "active"
        )
        .map((student) => student.id),
    [students]
  );

  useEffect(() => {
    if (grade9CompletionIds.length === 0 || updateStudentStatus.isPending) return;
    updateStudentStatus.mutate({
      studentIds: grade9CompletionIds,
      status: "completed",
    });
  }, [grade9CompletionIds, updateStudentStatus]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Students</h1>
            <p className="page-subtitle">Manage student records and enrollment</p>
          </div>
          {canWrite && <AddStudentDialog />}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="PP1">PP1</SelectItem>
              <SelectItem value="PP2">PP2</SelectItem>
              <SelectItem value="Grade 1">Grade 1</SelectItem>
              <SelectItem value="Grade 2">Grade 2</SelectItem>
              <SelectItem value="Grade 3">Grade 3</SelectItem>
              <SelectItem value="Grade 4">Grade 4</SelectItem>
              <SelectItem value="Grade 5">Grade 5</SelectItem>
              <SelectItem value="Grade 6">Grade 6</SelectItem>
              <SelectItem value="Grade 7">Grade 7</SelectItem>
              <SelectItem value="Grade 8">Grade 8</SelectItem>
              <SelectItem value="Grade 9">Grade 9</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Students Table */}
      <div className="data-table">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load students. Please try again.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {students.length === 0 ? "No students registered yet. Add your first student!" : "No students match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Adm No.
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Student Name
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Assessment No.
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Gender
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Class
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Parent/Guardian
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{student.admission_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{student.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {student.assessment_number || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground capitalize">{student.gender}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {student.classes ? `${student.classes.grade} ${student.classes.stream}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {student.parents?.full_name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColors[student.status as keyof typeof statusColors]}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2">
                            <Eye className="w-4 h-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <FileText className="w-4 h-4" /> View Report Card
                          </DropdownMenuItem>
                          {canWrite && (
                            <DropdownMenuItem className="gap-2">
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2"
                                  disabled={student.status === "transferred" || student.status === "completed"}
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <ArrowLeftRight className="w-4 h-4" /> Transfer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Transfer student?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This marks {student.full_name} as transferred and removes their class assignment.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      updateStudentStatus.mutate({
                                        studentIds: [student.id],
                                        status: "transferred",
                                        clearClass: true,
                                      })
                                    }
                                    disabled={updateStudentStatus.isPending}
                                  >
                                    {updateStudentStatus.isPending ? "Transferring..." : "Transfer"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {canDelete && (
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredStudents.length} of {students.length} students
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={filteredStudents.length <= 10}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
