import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bell, Calendar, Users, Megaphone } from "lucide-react";

const notices = [
  {
    id: 1,
    title: "Term 2 Exam Schedule Released",
    content: "The Term 2 examination schedule has been published. Exams will run from March 11-22, 2024.",
    date: "2024-02-15",
    audience: "All",
    priority: "high",
    status: "published",
  },
  {
    id: 2,
    title: "Parent-Teacher Meeting",
    content: "Annual parent-teacher meeting scheduled for February 28, 2024 at 2:00 PM.",
    date: "2024-02-14",
    audience: "Parents",
    priority: "medium",
    status: "published",
  },
  {
    id: 3,
    title: "School Fees Deadline",
    content: "Reminder: Term 2 fees should be cleared by February 29, 2024.",
    date: "2024-02-10",
    audience: "Parents",
    priority: "high",
    status: "published",
  },
  {
    id: 4,
    title: "Sports Day Announcement",
    content: "Annual sports day will be held on March 8, 2024. All students should have their PE kits.",
    date: "2024-02-08",
    audience: "All",
    priority: "low",
    status: "draft",
  },
];

const priorityStyles = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground border-border",
};

const statusStyles = {
  published: "bg-success/10 text-success border-success/20",
  draft: "bg-muted text-muted-foreground border-border",
};

export default function Notices() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Notices & Announcements</h1>
            <p className="page-subtitle">Communicate with parents, teachers, and students</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Notice
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold font-display text-foreground">{notices.length}</p>
            <p className="text-xs text-muted-foreground">Total Notices</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold font-display text-foreground">{notices.filter(n => n.status === "published").length}</p>
            <p className="text-xs text-muted-foreground">Published</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-bold font-display text-foreground">{notices.filter(n => n.status === "draft").length}</p>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-xl font-bold font-display text-foreground">{notices.filter(n => n.priority === "high").length}</p>
            <p className="text-xs text-muted-foreground">High Priority</p>
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{notice.title}</h3>
                    <Badge variant="outline" className={priorityStyles[notice.priority as keyof typeof priorityStyles]}>
                      {notice.priority}
                    </Badge>
                    <Badge variant="outline" className={statusStyles[notice.status as keyof typeof statusStyles]}>
                      {notice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{notice.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notice.date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {notice.audience}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
