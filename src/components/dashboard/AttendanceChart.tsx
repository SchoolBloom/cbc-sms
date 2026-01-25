import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AttendanceChartProps {
  classIds?: string[];
  title?: string;
}

const buildRecentDays = (count: number) => {
  const days: { date: string; label: string }[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateString = date.toISOString().split("T")[0];
    const label = date.toLocaleDateString("en-KE", { weekday: "short" });
    days.push({ date: dateString, label });
  }
  return days;
};

export function AttendanceChart({ classIds, title = "Weekly Attendance" }: AttendanceChartProps) {
  const recentDays = buildRecentDays(5);
  const startDate = recentDays[0]?.date;

  const { data: attendanceData } = useQuery({
    queryKey: ["attendance-chart", classIds],
    queryFn: async () => {
      if (classIds && classIds.length === 0) return [];
      if (!startDate) return [];

      let query = supabase
        .from("attendance")
        .select("date, status, class_id")
        .gte("date", startDate);

      if (classIds?.length) {
        query = query.in("class_id", classIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const chartData = recentDays.map((day) => {
    const records = attendanceData?.filter((record) => record.date === day.date) || [];
    const present = records.filter((record) => record.status !== "absent").length;
    const absent = records.filter((record) => record.status === "absent").length;
    return { name: day.label, present, absent };
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">This week</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
            />
            <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Present" />
            <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
