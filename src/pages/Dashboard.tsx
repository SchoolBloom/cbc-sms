import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { Users, GraduationCap, CreditCard, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title font-display">Good morning, John 👋</h1>
            <p className="page-subtitle">Here's what's happening at Sunrise Primary School today.</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">Term 2, 2024</p>
            <p className="text-xs text-muted-foreground">Week 8 of 14</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Students"
          value={448}
          subtitle="PP1 - Grade 9"
          icon={Users}
          trend={{ value: 3.2, isPositive: true }}
        />
        <StatCard
          title="Classes"
          value={18}
          subtitle="Across all grades"
          icon={GraduationCap}
          variant="primary"
        />
        <StatCard
          title="Fee Collection"
          value="KES 2.4M"
          subtitle="This term"
          icon={CreditCard}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Attendance Rate"
          value="96.2%"
          subtitle="This week"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <AttendanceChart />
          
          {/* CBC Performance Summary */}
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">CBC Performance Overview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-xl">
                <p className="text-2xl font-bold text-success font-display">68%</p>
                <p className="text-xs text-muted-foreground mt-1">Exceeding Expectations</p>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-xl">
                <p className="text-2xl font-bold text-primary font-display">24%</p>
                <p className="text-xs text-muted-foreground mt-1">Meeting Expectations</p>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-xl">
                <p className="text-2xl font-bold text-warning font-display">8%</p>
                <p className="text-xs text-muted-foreground mt-1">Approaching Expectations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </DashboardLayout>
  );
}
