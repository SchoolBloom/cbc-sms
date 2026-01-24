import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Student } from "@/hooks/useStudents";

interface StudentProfileDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors = {
  active: "bg-success/10 text-success border-success/20",
  transferred: "bg-muted text-muted-foreground border-muted",
  completed: "bg-primary/10 text-primary border-primary/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StudentProfileDialog({ student, open, onOpenChange }: StudentProfileDialogProps) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Student Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{student.full_name}</p>
              <p className="text-sm text-muted-foreground">{student.admission_number}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Assessment No.</p>
              <p className="font-medium text-foreground">{student.assessment_number || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Gender</p>
              <p className="font-medium text-foreground capitalize">{student.gender}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Class</p>
              <p className="font-medium text-foreground">
                {student.classes ? `${student.classes.grade} ${student.classes.stream}` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="outline" className={statusColors[student.status as keyof typeof statusColors]}>
                {student.status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="font-medium text-foreground">
                {new Date(student.date_of_birth).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Parent/Guardian</p>
              <p className="font-medium text-foreground">{student.parents?.full_name || "-"}</p>
            </div>
          </div>

          {student.medical_notes && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Medical Notes</p>
              {student.medical_notes}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
