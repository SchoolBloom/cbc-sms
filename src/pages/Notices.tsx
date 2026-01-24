import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Users, Megaphone, Eye, Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddNoticeDialog } from "@/components/notices/AddNoticeDialog";

const priorityStyles = { high: "bg-destructive/10 text-destructive border-destructive/20", medium: "bg-warning/10 text-warning border-warning/20", low: "bg-muted text-muted-foreground border-border" };

export default function Notices() {
  const { user, hasPermission } = useRole();
  const canWrite = hasPermission("notices:write");

  const { data: notices = [], isLoading, error } = useQuery({
    queryKey: ["notices", user.role],
    queryFn: async () => {
      let query = supabase
        .from("notices")
        .select("id, title, content, priority, target_audience, published, published_at, created_at")
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (user.role === "parent") {
        query = query.eq("published", true).overlaps("target_audience", ["parents", "all"]);
      }

      const { data, error: noticesError } = await query;
      if (noticesError) throw noticesError;
      return data || [];
    },
  });

  const visibleNotices = notices;
  const totalNotices = notices.length;
  const publishedCount = notices.filter((notice) => notice.published).length;
  const draftCount = notices.filter((notice) => !notice.published).length;
  const highPriorityCount = notices.filter((notice) => notice.priority === "high").length;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Notices & Announcements</h1>
            <p className="page-subtitle">{user.role === "parent" ? "Stay updated with school announcements" : "Communicate with parents, teachers, and students"}</p>
          </div>
          {canWrite && <AddNoticeDialog />}
        </div>
      </div>

      {user.role !== "parent" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xl font-bold">{totalNotices}</p><p className="text-xs text-muted-foreground">Total</p></div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Bell className="w-5 h-5 text-success" /></div>
            <div><p className="text-xl font-bold">{publishedCount}</p><p className="text-xs text-muted-foreground">Published</p></div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-warning" /></div>
            <div><p className="text-xl font-bold">{draftCount}</p><p className="text-xs text-muted-foreground">Drafts</p></div>
          </div>
          <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Users className="w-5 h-5 text-destructive" /></div>
            <div><p className="text-xl font-bold">{highPriorityCount}</p><p className="text-xs text-muted-foreground">High Priority</p></div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Failed to load notices. Please try again.
          </div>
        ) : visibleNotices.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/50">
            No notices available yet.
          </div>
        ) : (
          visibleNotices.map((notice) => (
          <div key={notice.id} className="bg-card rounded-xl border border-border/50 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{notice.title}</h3>
                    <Badge variant="outline" className={priorityStyles[notice.priority as keyof typeof priorityStyles]}>{notice.priority}</Badge>
                    {user.role !== "parent" && (
                      <Badge variant="outline" className="bg-success/10 text-success">
                        {notice.published ? "published" : "draft"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{notice.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(notice.published_at || notice.created_at).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {notice.target_audience?.length ? notice.target_audience.join(", ") : "all"}
                    </span>
                  </div>
                </div>
              </div>
              {user.role === "parent" ? (
                <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
              ) : canWrite && (
                <Button variant="ghost" size="sm">Edit</Button>
              )}
            </div>
          </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
