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
import { Calendar, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

type AttendanceStatus = "present" | "absent" | "late" | null;

export default function Attendance() {
  const [selectedGrade, setSelectedGrade] = useState("4A");
  const [selectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});

  const toggleAttendance = (studentId: number, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount = Object.values(attendance).filter((s) => s === "absent").length;
  const lateCount = Object.values(attendance).filter((s) => s === "late").length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Attendance</h1>
            <p className="page-subtitle">Record daily class attendance</p>
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
                <SelectItem value="PP1">PP1</SelectItem>
                <SelectItem value="PP2">PP2</SelectItem>
                <SelectItem value="1A">Grade 1A</SelectItem>
                <SelectItem value="1B">Grade 1B</SelectItem>
                <SelectItem value="2A">Grade 2A</SelectItem>
                <SelectItem value="2B">Grade 2B</SelectItem>
                <SelectItem value="3A">Grade 3A</SelectItem>
                <SelectItem value="4A">Grade 4A</SelectItem>
                <SelectItem value="4B">Grade 4B</SelectItem>
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
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 flex justify-end">
          <Button className="gap-2">
            <Check className="w-4 h-4" />
            Save Attendance
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
