import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, Filter, Download, MoreHorizontal, Eye, Edit, Trash2, FileText, Loader2, ArrowLeftRight, GraduationCap } from "lucide-react";
import { NEMISExportButton, KNECRegistrationExportButton } from "@/components/ui/ExportButtons";
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
import { useLearners, useUpdateLearnerStatus, useDeleteLearner, Learner } from "@/hooks/useLearners";
import { AddLearnerDialog } from "@/components/learners/AddLearnerDialog";
import { LearnerProfileDialog } from "@/components/learners/LearnerProfileDialog";
import { EditLearnerDialog } from "@/components/learners/EditLearnerDialog";
import { useSchoolScope } from "@/hooks/useSchoolScope";

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  transferred: "bg-muted text-muted-foreground border-muted",
  completed: "bg-primary/10 text-primary border-primary/20",
  cleared: "bg-primary/5 text-primary/80 border-primary/15",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

const CLEAR_ELIGIBLE_GRADES = new Set(["Grade 9", "Grade 12"]);

function isClearEligible(learner: Learner) {
  const grade = learner.classes?.grade;
  return !!grade && CLEAR_ELIGIBLE_GRADES.has(grade);
}

function isInactiveLearner(status: string) {
  return ["transferred", "completed", "cleared", "suspended"].includes(status);
}

export default function Learners() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allowedGrades, gradeBandLabel } = useSchoolScope();
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [viewLearner, setViewLearner] = useState<Learner | null>(null);
  const [editLearner, setEditLearner] = useState<Learner | null>(null);
  
  const { data: learners = [], isLoading, error } = useLearners();
  const updateLearnerStatus = useUpdateLearnerStatus();
  const deleteLearner = useDeleteLearner();
  
  const canWrite = user?.role === "admin";
  const canDelete = user?.role === "admin";

  const filteredLearners = learners.filter((learner) => {
    const matchesSearch = learner.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      learner.admission_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === "all" || learner.classes?.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });
  const sortedLearners = useMemo(
    () =>
      [...filteredLearners].sort((a, b) =>
        a.admission_number.localeCompare(b.admission_number, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [filteredLearners]
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Learners</h1>
            <p className="page-subtitle">Manage learner admissions and enrollment for {gradeBandLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {canWrite && <NEMISExportButton />}
            {canWrite && <KNECRegistrationExportButton />}
            {canWrite && <AddLearnerDialog />}
          </div>
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
              {allowedGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSearchQuery("");
              setGradeFilter("all");
            }}
            disabled={searchQuery.length === 0 && gradeFilter === "all"}
            aria-label="Clear filters"
            title="Clear filters"
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Learners Table */}
      <div className="data-table">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load learners. Please try again.
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {learners.length === 0 ? "No learners registered yet. Add your first student!" : "No learners match your search."}
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
                    Learner Name
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
                    Pathway
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
                {sortedLearners.map((learner) => {
                  const parentNames = [learner.parents?.full_name, learner.secondary_parent?.full_name].filter(Boolean);
                  return (
                  <tr key={learner.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{learner.admission_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {learner.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{learner.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {learner.assessment_number || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground capitalize">{learner.gender}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground">
                        {learner.classes ? `${learner.classes.grade} ${learner.classes.stream}` : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{learner.pathway || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {parentNames.length > 0 ? parentNames.join(", ") : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColors[learner.status as keyof typeof statusColors]}>
                        {learner.status === "cleared" ? "cleared (alumni)" : learner.status}
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
                          <DropdownMenuItem className="gap-2" onClick={() => setViewLearner(learner)}>
                            <Eye className="w-4 h-4" /> View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => navigate("/reports")}>
                            <FileText className="w-4 h-4" /> View Report Card
                          </DropdownMenuItem>
                          {canWrite && (
                            <DropdownMenuItem className="gap-2" onClick={() => setEditLearner(learner)}>
                              <Edit className="w-4 h-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2"
                                  disabled={isInactiveLearner(learner.status)}
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <ArrowLeftRight className="w-4 h-4" /> Transfer
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Transfer student?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This marks {learner.full_name} as transferred and removes their class assignment.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      updateLearnerStatus.mutate({
                                        learnerIds: [learner.id],
                                        status: "transferred",
                                        clearClass: true,
                                      })
                                    }
                                    disabled={updateLearnerStatus.isPending}
                                  >
                                    {updateLearnerStatus.isPending ? "Transferring..." : "Transfer"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {canWrite && isClearEligible(learner) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2"
                                  disabled={isInactiveLearner(learner.status)}
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <GraduationCap className="w-4 h-4" /> Clear
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Clear learner as alumni?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {learner.classes?.grade === "Grade 9"
                                      ? `This marks ${learner.full_name} as cleared from JSS. They are no longer an active learner at this school and will be recorded as alumni while advancing to Senior Secondary.`
                                      : `This marks ${learner.full_name} as cleared. They are no longer an active learner and will be recorded as alumni after completing their studies.`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      updateLearnerStatus.mutate({
                                        learnerIds: [learner.id],
                                        status: "cleared",
                                        clearClass: true,
                                        successMessage: `${learner.full_name} cleared and recorded as alumni`,
                                      })
                                    }
                                    disabled={updateLearnerStatus.isPending}
                                  >
                                    {updateLearnerStatus.isPending ? "Clearing..." : "Clear"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {canDelete && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive"
                                  onSelect={(event) => event.preventDefault()}
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete student?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently deletes {learner.full_name} and their related records.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteLearner.mutate(learner.id)}
                                    disabled={deleteLearner.isPending}
                                  >
                                    {deleteLearner.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Showing {filteredLearners.length} of {learners.length} learners
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={filteredLearners.length <= 10}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <LearnerProfileDialog
        learner={viewLearner}
        open={!!viewLearner}
        onOpenChange={(open) => !open && setViewLearner(null)}
      />
      <EditLearnerDialog
        learner={editLearner}
        open={!!editLearner}
        onOpenChange={(open) => !open && setEditLearner(null)}
      />
    </DashboardLayout>
  );
}
