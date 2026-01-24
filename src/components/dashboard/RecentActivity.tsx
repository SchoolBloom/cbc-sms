import { UserPlus, CreditCard, ClipboardCheck, Bell, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ActivityRole = "admin" | "teacher";

interface RecentActivityProps {
  role?: ActivityRole;
  classIds?: string[];
}

interface ActivityItem {
  id: string;
  message: string;
  time: string;
  icon: typeof UserPlus;
  iconBg: string;
  sortKey: string;
}

const formatActivityTime = (value?: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown";
  return date.toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function RecentActivity({ role = "admin", classIds }: RecentActivityProps) {
  const { data: activityItems = [] } = useQuery({
    queryKey: ["recent-activity", role, classIds],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      if (role === "admin") {
        const [{ data: students }, { data: fees }, { data: attendance }, { data: notices }] = await Promise.all([
          supabase
            .from("students")
            .select("id, full_name, created_at, classes:class_id (grade, stream)")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("fees")
            .select("id, amount, payment_date, payment_method, student:students(full_name)")
            .not("payment_date", "is", null)
            .order("payment_date", { ascending: false })
            .limit(3),
          supabase
            .from("attendance")
            .select("id, created_at, date, status, classes:class_id (grade, stream)")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("notices")
            .select("id, title, published_at, created_at")
            .eq("published", true)
            .order("published_at", { ascending: false })
            .limit(3),
        ]);

        students?.forEach((student) => {
          items.push({
            id: `student-${student.id}`,
            message: `${student.full_name} enrolled${student.classes ? ` in Grade ${student.classes.grade}${student.classes.stream}` : ""}`,
            time: formatActivityTime(student.created_at),
            icon: UserPlus,
            iconBg: "bg-primary/10 text-primary",
            sortKey: student.created_at,
          });
        });

        fees?.forEach((fee) => {
          items.push({
            id: `fee-${fee.id}`,
            message: `Fee payment of KES ${Number(fee.amount).toLocaleString("en-KE")} received for ${fee.student?.full_name || "student"}`,
            time: formatActivityTime(fee.payment_date),
            icon: CreditCard,
            iconBg: "bg-success/10 text-success",
            sortKey: fee.payment_date || "",
          });
        });

        attendance?.forEach((record) => {
          items.push({
            id: `attendance-${record.id}`,
            message: `Attendance recorded for ${record.classes ? `Grade ${record.classes.grade}${record.classes.stream}` : "class"} (${record.status})`,
            time: formatActivityTime(record.created_at),
            icon: ClipboardCheck,
            iconBg: "bg-info/10 text-info",
            sortKey: record.created_at,
          });
        });

        notices?.forEach((notice) => {
          items.push({
            id: `notice-${notice.id}`,
            message: `${notice.title} published`,
            time: formatActivityTime(notice.published_at || notice.created_at),
            icon: Bell,
            iconBg: "bg-warning/10 text-warning",
            sortKey: notice.published_at || notice.created_at,
          });
        });
      }

      if (role === "teacher") {
        if (classIds && classIds.length === 0) return [];

        const [{ data: attendance }, { data: assessments }, { data: notices }] = await Promise.all([
          supabase
            .from("attendance")
            .select("id, created_at, date, status, classes:class_id (grade, stream)")
            .in("class_id", classIds || [])
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("assessments")
            .select("id, created_at, learning_area, student:students(full_name), class:classes(grade, stream)")
            .in("class_id", classIds || [])
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("notices")
            .select("id, title, published_at, created_at")
            .eq("published", true)
            .order("published_at", { ascending: false })
            .limit(3),
        ]);

        attendance?.forEach((record) => {
          items.push({
            id: `attendance-${record.id}`,
            message: `Attendance recorded for ${record.classes ? `Grade ${record.classes.grade}${record.classes.stream}` : "class"} (${record.status})`,
            time: formatActivityTime(record.created_at),
            icon: ClipboardCheck,
            iconBg: "bg-info/10 text-info",
            sortKey: record.created_at,
          });
        });

        assessments?.forEach((assessment) => {
          items.push({
            id: `assessment-${assessment.id}`,
            message: `${assessment.learning_area} assessment recorded for ${assessment.student?.full_name || "student"}`,
            time: formatActivityTime(assessment.created_at),
            icon: BookOpen,
            iconBg: "bg-success/10 text-success",
            sortKey: assessment.created_at,
          });
        });

        notices?.forEach((notice) => {
          items.push({
            id: `notice-${notice.id}`,
            message: `${notice.title} published`,
            time: formatActivityTime(notice.published_at || notice.created_at),
            icon: Bell,
            iconBg: "bg-warning/10 text-warning",
            sortKey: notice.published_at || notice.created_at,
          });
        });
      }

      return items
        .filter((item) => item.sortKey)
        .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
        .slice(0, 4);
    },
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {activityItems.length > 0 ? (
          activityItems.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", activity.iconBg)}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        )}
      </div>
    </div>
  );
}
