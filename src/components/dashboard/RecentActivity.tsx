import { UserPlus, CreditCard, ClipboardCheck, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const activities = [
  {
    id: 1,
    type: "enrollment",
    message: "Grace Wanjiku enrolled in Grade 4A",
    time: "2 hours ago",
    icon: UserPlus,
    iconBg: "bg-primary/10 text-primary",
  },
  {
    id: 2,
    type: "payment",
    message: "Fee payment of KES 15,000 received for Peter Ochieng",
    time: "3 hours ago",
    icon: CreditCard,
    iconBg: "bg-success/10 text-success",
  },
  {
    id: 3,
    type: "attendance",
    message: "Attendance recorded for Grade 6B - 42/45 present",
    time: "5 hours ago",
    icon: ClipboardCheck,
    iconBg: "bg-info/10 text-info",
  },
  {
    id: 4,
    type: "notice",
    message: "Term 2 exam schedule published",
    time: "Yesterday",
    icon: Bell,
    iconBg: "bg-warning/10 text-warning",
  },
];

export function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", activity.iconBg)}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
