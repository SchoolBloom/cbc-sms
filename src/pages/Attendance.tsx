import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Clock, Eye, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

const mockStudents = [
  { id: 1, name: "Grace Wanjiku Kamau", admNo: "2024/001" },
  { id: 2, name: "Peter Ochieng Otieno", admNo: "2024/002" },
  { id: 3, name: "Faith Njeri Mwangi", admNo: "2024/003" },
  { id: 4, name: "David Kipchoge Korir", admNo: "2024/004" },
  { id: 5, name: "Sarah Akinyi Odhiambo", admNo: "2024/005" },
  { id: 6, name: "Joy Wambui Ngugi", admNo: "2024/006" },
  { id: 7, name: "Kevin Onyango Juma", admNo: "2024/007" },
  { id: 8, name: "Lucy Chebet Kosgei", admNo: "2024/008" },
];

// Parent view - child's attendance history
const childAttendanceHistory = [
  { date: "2024-02-19", status: "present" },
  { date: "2024-02-18", status: "present" },
  { date: "2024-02-17", status: "present" },
  { date: "2024-02-16", status: "present" },
  { date: "2024-02-15", status: "late" },
  { date: "2024-02-14", status: "present" },
  { date: "2024-02-13", status: "present" },
  { date: "2024-02-12", status: "absent" },
  { date: "2024-02-09", status: "present" },
  { date: "2024-02-08", status: "present" },
];

type AttendanceStatus = "present" | "absent" | "late" | null;

export default function Attendance() {
  const { user, hasPermission } = useRole();
  const [selectedGrade, setSelectedGrade] = useState("4A");
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const canWrite = hasPermission("attendance:write");

  const toggleAttendance = (studentId: number, status: AttendanceStatus) => {
    if (!canWrite) return;
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "late").length;

  // Parent view - shows child's attendance
  if (user.role === "parent") {
    const attendanceRate = Math.round(
      (childAttendanceHistory.filter((a) => a.status === "present").length / childAttendanceHistory.length) * 100
    );

    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title font-display">Attendance Record</h1>
          <p className="page-subtitle">View your child's attendance history</p>
        </div>

        {/* Child Info */}
        <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">GK</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-display font-semibold text-foreground">Grace Wanjiku Kamau</h2>
              <p className="text-sm text-muted-foreground">Grade 4A • Admission No: 2024/001</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">{attendanceRate}%</span>
              </div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-success/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success">
              {childAttendanceHistory.filter((a) => a.status === "present").length}
            </p>
            <p className="text-sm text-muted-foreground">Present</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {childAttendanceHistory.filter((a) => a.status === "late").length}
            </p>
            <p className="text-sm text-muted-foreground">Late</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {childAttendanceHistory.filter((a) => a.status === "absent").length}
            </p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Attendance History</h3>
          </div>
          <div className="divide-y divide-border">
            {childAttendanceHistory.map((record, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {new Date(record.date).toLocaleDateString("en-KE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    record.status === "present" && "bg-success/10 text-success border-success/20",
                    record.status === "late" && "bg-warning/10 text-warning border-warning/20",
                    record.status === "absent" && "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin/Teacher view - record attendance
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Attendance</h1>
            <p className="page-subtitle">
              {canWrite ? "Record daily class attendance" : "View attendance records"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border/50 rounded-lg px-3 py-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {user.role === "teacher" && user.assignedClasses ? (
                  user.assignedClasses.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Grade {cls}
                    </SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="PP1">PP1</SelectItem>
                    <SelectItem value="PP2">PP2</SelectItem>
                    <SelectItem value="1A">Grade 1A</SelectItem>
                    <SelectItem value="1B">Grade 1B</SelectItem>
                    <SelectItem value="2A">Grade 2A</SelectItem>
                    <SelectItem value="2B">Grade 2B</SelectItem>
                    <SelectItem value="3A">Grade 3A</SelectItem>
                    <SelectItem value="4A">Grade 4A</SelectItem>
                    <SelectItem value="4B">Grade 4B</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {user.role === "teacher" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Your Class
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Present: {presentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Absent: {absentCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Late: {lateCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-display font-semibold text-foreground">
            Class {selectedGrade} - {mockStudents.length} Students
          </h3>
        </div>
        <div className="divide-y divide-border">
          {mockStudents.map((student) => {
            const status = attendance[student.id];
            return (
              <div
                key={student.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {student.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.admNo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canWrite ? (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-9 w-9 transition-all",
                          status === "present" && "bg-success text-success-foreground border-success hover:bg-success/90"
                        )}
                        onClick={() => toggleAttendance(student.id, "present")}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-9 w-9 transition-all",
                          status === "absent" && "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90"
                        )}
                        onClick={() => toggleAttendance(student.id, "absent")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-9 w-9 transition-all",
                          status === "late" && "bg-warning text-warning-foreground border-warning hover:bg-warning/90"
                        )}
                        onClick={() => toggleAttendance(student.id, "late")}
                      >
                        <Clock className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="w-4 h-4" />
                      View History
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {canWrite && (
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-end">
            <Button className="gap-2">
              <Check className="w-4 h-4" />
              Save Attendance
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
