import { useState, useEffect } from "react";
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
import { Calendar, Check, X, Clock, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useAttendance, useSaveAttendance, useStudentAttendanceHistory } from "@/hooks/useAttendance";

type AttendanceStatus = "present" | "absent" | "late" | null;

export default function Attendance() {
  const { user, hasPermission } = useRole();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const canWrite = hasPermission("attendance:write");

  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: existingAttendance } = useAttendance(selectedClassId, selectedDate);
  const saveAttendance = useSaveAttendance();

  // Get demo child ID for parent view
  const { data: attendanceHistory } = useStudentAttendanceHistory(
    user.role === "parent" ? user.childrenIds?.[0] : undefined
  );

  // Filter students by selected class
  const classStudents = students?.filter((s) => s.class_id === selectedClassId) || [];

  // Load existing attendance when class/date changes
  useEffect(() => {
    if (existingAttendance) {
      const attendanceMap: Record<string, AttendanceStatus> = {};
      existingAttendance.forEach((record: any) => {
        attendanceMap[record.student_id] = record.status as AttendanceStatus;
      });
      setAttendance(attendanceMap);
    } else {
      setAttendance({});
    }
  }, [existingAttendance]);

  const toggleAttendance = (studentId: string, status: AttendanceStatus) => {
    if (!canWrite) return;
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const handleSaveAttendance = () => {
    const records = Object.entries(attendance)
      .filter(([_, status]) => status !== null)
      .map(([studentId, status]) => ({
        student_id: studentId,
        class_id: selectedClassId,
        date: selectedDate,
        status: status as string,
      }));

    if (records.length === 0) return;
    saveAttendance.mutate(records);
  };

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "late").length;

  // Parent view - shows child's attendance
  if (user.role === "parent") {
    const attendanceRate = attendanceHistory?.length
      ? Math.round((attendanceHistory.filter((a) => a.status === "present").length / attendanceHistory.length) * 100)
      : 0;

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
              {attendanceHistory?.filter((a) => a.status === "present").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Present</p>
          </div>
          <div className="bg-warning/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-warning">
              {attendanceHistory?.filter((a) => a.status === "late").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Late</p>
          </div>
          <div className="bg-destructive/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {attendanceHistory?.filter((a) => a.status === "absent").length || 0}
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
            {attendanceHistory?.map((record, idx) => (
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
            {(!attendanceHistory || attendanceHistory.length === 0) && (
              <div className="px-5 py-8 text-center text-muted-foreground">
                No attendance records found
              </div>
            )}
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
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-card border border-border/50 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border/50 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classesLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : (
                  classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      Grade {cls.grade} {cls.stream}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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
            {selectedClassId 
              ? `${classes?.find((c) => c.id === selectedClassId)?.grade || ""} ${classes?.find((c) => c.id === selectedClassId)?.stream || ""} - ${classStudents.length} Students`
              : "Select a class to record attendance"
            }
          </h3>
        </div>
        
        {studentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !selectedClassId ? (
          <div className="py-12 text-center text-muted-foreground">
            Please select a class to view students
          </div>
        ) : classStudents.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No students in this class
          </div>
        ) : (
          <div className="divide-y divide-border">
            {classStudents.map((student) => {
              const status = attendance[student.id];
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {student.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.admission_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canWrite && (
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {canWrite && selectedClassId && classStudents.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-end">
            <Button 
              className="gap-2" 
              onClick={handleSaveAttendance}
              disabled={saveAttendance.isPending || Object.keys(attendance).length === 0}
            >
              {saveAttendance.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save Attendance
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
