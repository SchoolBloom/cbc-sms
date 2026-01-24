import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Teacher } from "@/hooks/useTeachers";

interface TeacherProfileDialogProps {
  teacher: Teacher | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes?: string[];
  subjects?: string[];
}

export function TeacherProfileDialog({
  teacher,
  open,
  onOpenChange,
  classes = [],
  subjects = [],
}: TeacherProfileDialogProps) {
  if (!teacher) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Teacher Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{teacher.full_name}</p>
              <p className="text-sm text-muted-foreground">{teacher.email || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">{teacher.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge variant="secondary" className="text-xs">
                Teacher
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Classes</p>
              <p className="font-medium text-foreground">{classes.length ? classes.join(", ") : "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Subjects</p>
              <p className="font-medium text-foreground">{subjects.length ? subjects.join(", ") : "Unassigned"}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
