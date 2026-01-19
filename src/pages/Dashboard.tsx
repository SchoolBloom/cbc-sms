import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { Users, GraduationCap, CreditCard, TrendingUp, BookOpen, ClipboardCheck, Bell, Calendar } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useRole();

  // Role-specific greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${timeGreeting}, ${user.name.split(" ")[0]} 👋`;
  };

  // Role-specific subtitle
  const getSubtitle = () => {
    switch (user.role) {
      case "admin":
        return "Here's what's happening at Sunrise Primary School today.";
      case "teacher":
        return `You have classes in ${user.assignedClasses?.join(", ")} today.`;
      case "parent":
        return "Stay updated on your child's progress and school activities.";
      case "bursar":
        return "Overview of fee collection and financial status.";
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title font-display">{getGreeting()}</h1>
            <p className="page-subtitle">{getSubtitle()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">Term 2, 2024</p>
            <p className="text-xs text-muted-foreground">Week 8 of 14</p>
          </div>
        </div>
      </div>

      {/* Admin Dashboard */}
      {user.role === "admin" && (
        <>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <AttendanceChart />
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
            <div className="space-y-6">
              <QuickActions />
              <RecentActivity />
            </div>
          </div>
        </>
      )}

      {/* Teacher Dashboard */}
      {user.role === "teacher" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="My Classes"
              value={user.assignedClasses?.length || 2}
              subtitle={user.assignedClasses?.join(", ") || "4A, 4B"}
              icon={GraduationCap}
              variant="primary"
            />
            <StatCard
              title="Students"
              value={68}
              subtitle="In your classes"
              icon={Users}
            />
            <StatCard
              title="Today's Attendance"
              value="94%"
              subtitle="2 absent"
              icon={ClipboardCheck}
              variant="success"
            />
            <StatCard
              title="Pending Assessments"
              value={5}
              subtitle="Need grading"
              icon={BookOpen}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Schedule */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Today's Schedule</h3>
                <div className="space-y-3">
                  {[
                    { time: "8:00 - 8:40", class: "4A", subject: "Mathematics", status: "completed" },
                    { time: "8:45 - 9:25", class: "4B", subject: "Mathematics", status: "completed" },
                    { time: "9:30 - 10:10", class: "4A", subject: "English", status: "current" },
                    { time: "10:15 - 10:55", class: "4B", subject: "English", status: "upcoming" },
                    { time: "11:30 - 12:10", class: "4A", subject: "Science", status: "upcoming" },
                  ].map((lesson, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        lesson.status === "current"
                          ? "bg-primary/10 border-primary/30"
                          : lesson.status === "completed"
                          ? "bg-muted/50 border-border/50"
                          : "bg-card border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-muted-foreground">{lesson.time}</span>
                        <span className="font-medium text-foreground">{lesson.subject}</span>
                        <Badge variant="outline">{lesson.class}</Badge>
                      </div>
                      {lesson.status === "current" && (
                        <Badge className="bg-primary text-primary-foreground">In Progress</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <AttendanceChart />
            </div>
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">Take Attendance</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <BookOpen className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium">Record Assessment</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <Bell className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium">View Notices</span>
                  </button>
                </div>
              </div>
              <RecentActivity />
            </div>
          </div>
        </>
      )}

      {/* Parent Dashboard */}
      {user.role === "parent" && (
        <>
          {/* Child Info Card */}
          <div className="bg-card rounded-xl border border-border/50 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">GK</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-display font-semibold text-foreground">Grace Wanjiku Kamau</h2>
                <p className="text-muted-foreground">Grade 4A • Admission No: 2024/001</p>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                Active
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Attendance"
              value="98%"
              subtitle="This term"
              icon={ClipboardCheck}
              variant="success"
            />
            <StatCard
              title="Performance"
              value="EE"
              subtitle="Exceeding Expectations"
              icon={TrendingUp}
              variant="primary"
            />
            <StatCard
              title="Fee Balance"
              value="KES 0"
              subtitle="Fully paid"
              icon={CreditCard}
            />
            <StatCard
              title="Notices"
              value={3}
              subtitle="Unread"
              icon={Bell}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Performance */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Recent Performance</h3>
                <div className="space-y-3">
                  {[
                    { subject: "Mathematics", level: "EE", score: "Exceeding Expectations" },
                    { subject: "English", level: "ME", score: "Meeting Expectations" },
                    { subject: "Kiswahili", level: "EE", score: "Exceeding Expectations" },
                    { subject: "Science & Technology", level: "EE", score: "Exceeding Expectations" },
                  ].map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium text-foreground">{result.subject}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            result.level === "EE"
                              ? "bg-success text-success-foreground"
                              : result.level === "ME"
                              ? "bg-primary text-primary-foreground"
                              : "bg-warning text-warning-foreground"
                          }
                        >
                          {result.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{result.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance History */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">This Week's Attendance</h3>
                <div className="grid grid-cols-5 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => (
                    <div key={day} className="text-center">
                      <p className="text-xs text-muted-foreground mb-2">{day}</p>
                      <div
                        className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                          idx < 4 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {idx < 4 ? "✓" : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Upcoming Events */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Upcoming Events</h3>
                <div className="space-y-3">
                  {[
                    { date: "Feb 28", event: "Parent-Teacher Meeting", time: "2:00 PM" },
                    { date: "Mar 8", event: "Sports Day", time: "All Day" },
                    { date: "Mar 11", event: "Term 2 Exams Begin", time: "" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                        <span className="text-xs text-muted-foreground">{item.date.split(" ")[0]}</span>
                        <span className="text-lg font-bold text-primary">{item.date.split(" ")[1]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.event}</p>
                        {item.time && <p className="text-xs text-muted-foreground">{item.time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fee Summary */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Fee Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Term Fee</span>
                    <span className="font-medium text-foreground">KES 45,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-success">KES 45,000</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">Balance</span>
                      <span className="font-bold text-success">KES 0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bursar Dashboard */}
      {user.role === "bursar" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Expected (Term)"
              value="KES 18.2M"
              subtitle="448 students"
              icon={CreditCard}
            />
            <StatCard
              title="Collected"
              value="KES 14.4M"
              subtitle="79% collection rate"
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Outstanding"
              value="KES 3.8M"
              subtitle="From 86 students"
              icon={Calendar}
              variant="primary"
            />
            <StatCard
              title="Today's Receipts"
              value="KES 125K"
              subtitle="12 payments"
              icon={CreditCard}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Collection by Grade */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Collection by Grade</h3>
                <div className="space-y-3">
                  {[
                    { grade: "PP1-PP2", expected: 2800000, collected: 2520000 },
                    { grade: "Grade 1-3", expected: 4200000, collected: 3780000 },
                    { grade: "Grade 4-6", expected: 5600000, collected: 4480000 },
                    { grade: "Grade 7-9", expected: 5600000, collected: 3640000 },
                  ].map((row, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{row.grade}</span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((row.collected / row.expected) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${(row.collected / row.expected) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Collected: KES {(row.collected / 1000000).toFixed(1)}M</span>
                        <span>Expected: KES {(row.expected / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-display font-semibold text-foreground">Recent Payments</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { student: "Peter Ochieng", grade: "6B", amount: 15000, method: "M-Pesa", time: "10:30 AM" },
                    { student: "Sarah Akinyi", grade: "PP2", amount: 38000, method: "Bank", time: "9:45 AM" },
                    { student: "Kevin Onyango", grade: "2B", amount: 20000, method: "M-Pesa", time: "9:15 AM" },
                    { student: "Faith Njeri", grade: "3A", amount: 42000, method: "Cheque", time: "Yesterday" },
                  ].map((payment, idx) => (
                    <div key={idx} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{payment.student}</p>
                        <p className="text-xs text-muted-foreground">{payment.grade} • {payment.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-success">+KES {payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{payment.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-card rounded-xl border border-border/50 p-5">
                <h3 className="font-display font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-left">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm font-medium">Record Payment</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Generate Statement</span>
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                    <Bell className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium">Send Reminders</span>
                  </button>
                </div>
              </div>

              {/* Defaulters */}
              <div className="bg-card rounded-xl border border-destructive/30 p-5">
                <h3 className="font-display font-semibold text-destructive mb-4">High Balances</h3>
                <div className="space-y-3">
                  {[
                    { student: "David Kipchoge", grade: "7A", balance: 32000 },
                    { student: "Brian Mutua", grade: "8B", balance: 28000 },
                    { student: "Lucy Chebet", grade: "5A", balance: 24000 },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.student}</p>
                        <p className="text-xs text-muted-foreground">{item.grade}</p>
                      </div>
                      <span className="font-medium text-destructive text-sm">
                        KES {item.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
