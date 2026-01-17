import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, TrendingUp, Star } from "lucide-react";

// CBC Learning Areas for Primary
const learningAreas = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Science & Technology",
  "Social Studies",
  "Religious Education",
  "Creative Arts",
  "Physical & Health Education",
];

// CBC Performance Levels
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
  { id: 4, class: "Grade 5A", subject: "Kiswahili", date: "2024-02-13", teacher: "Mr. Samuel Otieno", status: "completed" },
];

export default function Assessments() {
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title font-display">CBC Assessments</h1>
            <p className="page-subtitle">Record and track student performance using CBC rubrics</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New Assessment
          </Button>
        </div>
      </div>

      {/* Performance Levels Guide */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mb-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />
          CBC Performance Levels
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
        {/* Learning Areas */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Learning Areas</h3>
            <div className="space-y-2">
              {learningAreas.map((area) => (
                <div
                  key={area}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{area}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Assessments */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground">Recent Assessments</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                View All
              </Button>
            </div>
            <div className="divide-y divide-border">
              {recentAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="px-5 py-4 hover:bg-muted/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {assessment.class} - {assessment.subject}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assessment.teacher} • {new Date(assessment.date).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      assessment.status === "completed"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
                    {assessment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display text-foreground">85%</p>
                  <p className="text-sm text-muted-foreground">Assessments Complete</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Term 2, 2024</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display text-foreground">156</p>
                  <p className="text-sm text-muted-foreground">Reports Generated</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">This term</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
