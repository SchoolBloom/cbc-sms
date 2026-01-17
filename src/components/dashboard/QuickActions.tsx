import { Link } from "react-router-dom";
import { UserPlus, ClipboardCheck, FileText, CreditCard, Bell, Calendar } from "lucide-react";

const actions = [
  { name: "Add Student", icon: UserPlus, href: "/students/new", color: "bg-primary/10 text-primary" },
  { name: "Take Attendance", icon: ClipboardCheck, href: "/attendance", color: "bg-success/10 text-success" },
  { name: "Record Assessment", icon: FileText, href: "/assessments", color: "bg-info/10 text-info" },
  { name: "Record Payment", icon: CreditCard, href: "/fees", color: "bg-accent/10 text-accent" },
  { name: "Send Notice", icon: Bell, href: "/notices", color: "bg-warning/10 text-warning" },
  { name: "View Calendar", icon: Calendar, href: "/calendar", color: "bg-secondary text-secondary-foreground" },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <Link
            key={action.name}
            to={action.href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
          >
            <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-foreground text-center">{action.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
