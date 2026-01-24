import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useRole } from "@/contexts/RoleContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar as CalendarIcon, Users, MapPin } from "lucide-react";
import { AddEventDialog } from "@/components/events/AddEventDialog";

type NoticeEvent = {
  id: string;
  title: string;
  priority: string;
  target_audience: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
};

function getEventDate(event: NoticeEvent) {
  return new Date(event.published_at || event.created_at);
}

type SchoolEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  created_at: string;
};

function getSchoolEventDate(event: SchoolEvent) {
  return new Date(event.event_date);
}

export default function CalendarPage() {
  const { user } = useRole();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: notices = [], isLoading, error } = useQuery({
    queryKey: ["calendar-notices", user.role],
    queryFn: async () => {
      let query = supabase
        .from("notices")
        .select("id, title, priority, target_audience, published, published_at, created_at")
        .order("published_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (user.role === "parent") {
        query = query.eq("published", true).overlaps("target_audience", ["parents", "all"]);
      }

      const { data, error: noticesError } = await query;
      if (noticesError) throw noticesError;
      return (data || []) as NoticeEvent[];
    },
  });

  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error: eventsQueryError } = await supabase
        .from("events")
        .select("id, title, description, location, event_date, created_at")
        .order("event_date", { ascending: true });

      if (eventsQueryError) throw eventsQueryError;
      return (data || []) as SchoolEvent[];
    },
  });

  const eventDates = useMemo(
    () => [...notices.map(getEventDate), ...events.map(getSchoolEventDate)],
    [events, notices]
  );

  const selectedEvents = useMemo(() => {
    if (!selectedDate) {
      return { noticeMatches: [], eventMatches: [] };
    }
    const selectedKey = selectedDate.toDateString();
    const noticeMatches = notices.filter(
      (notice) => getEventDate(notice).toDateString() === selectedKey
    );
    const eventMatches = events.filter(
      (event) => getSchoolEventDate(event).toDateString() === selectedKey
    );

    return { noticeMatches, eventMatches };
  }, [events, notices, selectedDate]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title font-display">School Calendar</h1>
            <p className="page-subtitle">View important dates, notices, and events</p>
          </div>
          {user.role === "admin" && (
            <div className="flex flex-wrap gap-2">
              <AddEventDialog />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-card rounded-xl border border-border/50 p-5">
          {isLoading || eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : error || eventsError ? (
            <div className="text-center py-12 text-destructive">
              Failed to load calendar events. Please try again.
            </div>
          ) : (
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ event: eventDates }}
              modifiersClassNames={{
                event: "bg-primary/15 text-primary font-semibold",
              }}
              className="rounded-lg"
            />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">Events & Notices</h2>
            <Badge variant="outline" className="text-xs">
              {selectedDate
                ? selectedDate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })
                : "Select a date"}
            </Badge>
          </div>
          <div className="space-y-3">
            {selectedEvents.noticeMatches.length === 0 && selectedEvents.eventMatches.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events for this date.</div>
            ) : (
              <>
                {selectedEvents.eventMatches.map((event) => (
                  <div key={`event-${event.id}`} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{event.title}</p>
                        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                          Event
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {getSchoolEventDate(event).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {selectedEvents.noticeMatches.map((event) => (
                  <div key={`notice-${event.id}`} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{event.title}</p>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          Notice
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {getEventDate(event).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.target_audience?.length ? event.target_audience.join(", ") : "all"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
