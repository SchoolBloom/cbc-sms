import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Parent } from "@/hooks/useParents";

interface ParentProfileDialogProps {
  parent: Parent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParentProfileDialog({ parent, open, onOpenChange }: ParentProfileDialogProps) {
  if (!parent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Parent Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {parent.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{parent.full_name}</p>
              <p className="text-sm text-muted-foreground">{parent.phone}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{parent.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Occupation</p>
              <p className="font-medium text-foreground">{parent.occupation || "-"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium text-foreground">{parent.address || "-"}</p>
            </div>
          </div>

          {parent.children && parent.children.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">Children</p>
              <div className="flex flex-wrap gap-2">
                {parent.children.map((child) => (
                  <Badge key={child.id} variant="secondary" className="text-xs">
                    {child.full_name} {child.classes ? `(${child.classes.grade}${child.classes.stream})` : ""}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
