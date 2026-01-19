import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, TrendingUp, Star, Eye } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

const learningAreas = ["Mathematics", "English", "Kiswahili", "Science & Technology", "Social Studies", "Religious Education", "Creative Arts", "Physical & Health Education"];

const performanceLevels = [
  { level: "EE", name: "Exceeding Expectations", color: "bg-success text-success-foreground" },
  { level: "ME", name: "Meeting Expectations", color: "bg-primary text-primary-foreground" },
  { level: "AE", name: "Approaching Expectations", color: "bg-warning text-warning-foreground" },
  { level: "BE", name: "Below Expectations", color: "bg-destructive text-destructive-foreground" },
];

const recentAssessments = [
  { id: 1, class: "Grade 4A", subject: "Mathematics", date: "2024-02-15", teacher: "Mr. John Mwangi", status: "completed" },
  { id: 2, class: "Grade 6B", subject: "English", date: "2024-02-14", teacher: "Mr. Charles Kipruto", status: "completed" },
  { id: 3, class: "Grade 3A", subject: "Science & Technology", date: "2024-02-14", teacher: "Ms. Lucy Adhiambo", status: "pending" },
];

// Parent view data
const childAssessments = [
  { subject: "Mathematics", level: "EE", comment: "Excellent problem-solving skills", date: "Feb 2024" },
  { subject: "English", level: "ME", comment: "Good progress in reading comprehension", date: "Feb 2024" },
  { subject: "Kiswahili", level: "EE", comment: "Outstanding performance", date: "Feb 2024" },
  { subject: "Science & Technology", level: "EE", comment: "Shows great curiosity and understanding", date: "Feb 2024" },
  { subject: "Social Studies", level: "ME", comment: "Good grasp of concepts", date: "Feb 2024" },
];

export default function Assessments() {
  const { user, hasPermission } = useRole();
  const canWrite = hasPermission("assessments:write");

  // Parent view
  if (user.role === "parent") {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1 className="page-title font-display">Academic Progress</h1>
          <p className="page-subtitle">View your child's CBC assessment results</p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">GK</span>
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Grace Wanjiku Kamau</h2>
              <p className="text-sm text-muted-foreground">Grade 4A • Term 2, 2024</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />CBC Performance Levels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {performanceLevels.map((level) => (
              <div key={level.level} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className={level.color}>{level.level}</Badge>
                <span className="text-sm text-foreground">{level.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Assessment Results</h3>
          </div>
          <div className="divide-y divide-border">
            {childAssessments.map((assessment, idx) => (
              <div key={idx} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{assessment.subject}</span>
                  <Badge className={performanceLevels.find(p => p.level === assessment.level)?.color}>
                    {assessment.level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{assessment.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Admin/Teacher view
  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">CBC Assessments</h1>
            <p className="page-subtitle">{canWrite ? "Record and track student performance" : "View assessment records"}</p>
          </div>
          {canWrite && <Button className="gap-2"><Plus className="w-4 h-4" />New Assessment</Button>}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />CBC Performance Levels
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {performanceLevels.map((level) => (
            <div key={level.level} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge className={level.color}>{level.level}</Badge>
              <span className="text-sm text-foreground">{level.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Learning Areas</h3>
            <div className="space-y-2">
              {learningAreas.map((area) => (
                <div key={area} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{area}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h3 className="font-display font-semibold text-foreground">Recent Assessments</h3></div>
            <div className="divide-y divide-border">
              {recentAssessments.map((assessment) => (
                <div key={assessment.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{assessment.class} - {assessment.subject}</p>
                      <p className="text-sm text-muted-foreground">{assessment.teacher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={assessment.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{assessment.status}</Badge>
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
