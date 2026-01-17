import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Users, BookOpen } from "lucide-react";

const grades = [
  { name: "PP1", streams: [{ name: "PP1", students: 32, teacher: "Ms. Jane Wanjiru" }] },
  { name: "PP2", streams: [{ name: "PP2", students: 28, teacher: "Ms. Sarah Achieng" }] },
  { name: "Grade 1", streams: [
    { name: "1A", students: 35, teacher: "Mr. David Kiprop" },
    { name: "1B", students: 33, teacher: "Ms. Grace Njoki" },
  ]},
  { name: "Grade 2", streams: [
    { name: "2A", students: 30, teacher: "Ms. Faith Wambui" },
    { name: "2B", students: 32, teacher: "Mr. Peter Omondi" },
  ]},
  { name: "Grade 3", streams: [
    { name: "3A", students: 28, teacher: "Ms. Lucy Adhiambo" },
  ]},
  { name: "Grade 4", streams: [
    { name: "4A", students: 36, teacher: "Mr. John Mwangi" },
    { name: "4B", students: 34, teacher: "Ms. Rose Chebet" },
  ]},
  { name: "Grade 5", streams: [
    { name: "5A", students: 32, teacher: "Mr. Samuel Otieno" },
  ]},
  { name: "Grade 6", streams: [
    { name: "6A", students: 30, teacher: "Ms. Esther Njeri" },
    { name: "6B", students: 28, teacher: "Mr. Charles Kipruto" },
  ]},
  { name: "Grade 7", streams: [
    { name: "7A", students: 25, teacher: "Mr. Joseph Kamau" },
  ]},
  { name: "Grade 8", streams: [
    { name: "8A", students: 22, teacher: "Ms. Anne Wangari" },
    { name: "8B", students: 24, teacher: "Mr. Michael Odera" },
  ]},
];

export default function Classes() {
  const totalStudents = grades.reduce((acc, grade) => 
    acc + grade.streams.reduce((streamAcc, stream) => streamAcc + stream.students, 0), 0
  );
  const totalStreams = grades.reduce((acc, grade) => acc + grade.streams.length, 0);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">Classes & Grades</h1>
            <p className="page-subtitle">CBC academic structure from PP1 to Grade 9</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Stream
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{grades.length}</p>
            <p className="text-sm text-muted-foreground">Grade Levels</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{totalStreams}</p>
            <p className="text-sm text-muted-foreground">Total Streams</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{totalStudents}</p>
            <p className="text-sm text-muted-foreground">Total Enrollment</p>
          </div>
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grades.map((grade) => (
          <div key={grade.name} className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="bg-primary/5 px-4 py-3 border-b border-border/50">
              <h3 className="font-display font-semibold text-foreground">{grade.name}</h3>
            </div>
            <div className="p-4 space-y-3">
              {grade.streams.map((stream) => (
                <div
                  key={stream.name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-medium text-foreground">{stream.name}</p>
                    <p className="text-xs text-muted-foreground">{stream.teacher}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{stream.students}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
