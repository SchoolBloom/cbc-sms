import { UserPlus, BookOpen, Route, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ActivityRole = "admin" | "teacher";

interface RecentActivityProps {
  role?: ActivityRole;
  classIds?: string[];
  teacherId?: string;
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

export function RecentActivity({ role = "admin", classIds, teacherId }: RecentActivityProps) {
  const { data: activityItems = [], isLoading } = useQuery({
    queryKey: ["recent-activity", role, classIds, teacherId],
    queryFn: async () => {
      const items: ActivityItem[] = [];

      if (role === "admin") {
        const [{ data: learners }, { data: assessments }, { data: pathways }] = await Promise.all([
          supabase
            .from("learners")
            .select("id, full_name, created_at, classes:class_id (grade, stream)")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("assessment_records")
            .select("id, created_at, rubric_score, learner:learners(full_name), sub_strand:sub_strands(name, strand:strands(learning_area))")
            .order("created_at", { ascending: false })
            .limit(3),
          supabase
            .from("pathway_allocations")
            .select("id, created_at, pathway, learner:learners(full_name)")
            .order("created_at", { ascending: false })
            .limit(2),
        ]);

        learners?.forEach((learner) => {
          items.push({
            id: `learner-${learner.id}`,
            message: `${learner.full_name} enrolled${learner.classes ? ` in Grade ${learner.classes.grade}${learner.classes.stream}` : ""}`,
            time: formatActivityTime(learner.created_at),
            icon: UserPlus,
            iconBg: "bg-primary/10 text-primary",
            sortKey: learner.created_at,
          });
        });

        assessments?.forEach((record) => {
          const area = record.sub_strand?.strand?.learning_area || "Learning Area";
          items.push({
            id: `assessment-${record.id}`,
            message: `Recorded ${record.rubric_score} in ${area} for ${record.learner?.full_name || "student"}`,
            time: formatActivityTime(record.created_at),
            icon: BookOpen,
            iconBg: "bg-success/10 text-success",
            sortKey: record.created_at,
          });
        });

        pathways?.forEach((pathway) => {
          items.push({
            id: `pathway-${pathway.id}`,
            message: `Confirmed ${pathway.pathway} pathway allocation for ${pathway.learner?.full_name || "student"}`,
            time: formatActivityTime(pathway.created_at),
            icon: Route,
            iconBg: "bg-warning/10 text-warning",
            sortKey: pathway.created_at,
          });
        });
      }

      if (role === "teacher") {
        if (!teacherId) return [];

        const [{ data: teacherAssessments }, { data: newLearners }] = await Promise.all([
          supabase
            .from("assessment_records")
            .select("id, created_at, rubric_score, learner:learners(full_name), sub_strand:sub_strands(name, strand:strands(learning_area))")
            .eq("teacher_id", teacherId)
            .order("created_at", { ascending: false })
            .limit(4),
          classIds && classIds.length > 0
            ? supabase
                .from("learners")
                .select("id, full_name, created_at")
                .in("class_id", classIds)
                .order("created_at", { ascending: false })
                .limit(2)
            : Promise.resolve({ data: [] }),
        ]);

        teacherAssessments?.forEach((record) => {
          const area = record.sub_strand?.strand?.learning_area || "Learning Area";
          items.push({
            id: `assessment-${record.id}`,
            message: `Recorded ${record.rubric_score} in ${area} for ${record.learner?.full_name || "student"}`,
            time: formatActivityTime(record.created_at),
            icon: BookOpen,
            iconBg: "bg-success/10 text-success",
            sortKey: record.created_at,
          });
        });

        newLearners?.forEach((learner) => {
          items.push({
            id: `learner-${learner.id}`,
            message: `New student ${learner.full_name} joined class`,
            time: formatActivityTime(learner.created_at),
            icon: UserPlus,
            iconBg: "bg-primary/10 text-primary",
            sortKey: learner.created_at,
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
      </div>
      {isLoading ? (
        <div className="flex justify-center py-6 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
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
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
