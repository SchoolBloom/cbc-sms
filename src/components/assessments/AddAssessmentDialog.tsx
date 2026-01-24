import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useClasses } from "@/hooks/useClasses";
import { useStudents } from "@/hooks/useStudents";
import { useCreateAssessment, LEARNING_AREAS, PERFORMANCE_LEVELS } from "@/hooks/useAssessments";

export function AddAssessmentDialog() {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [learningArea, setLearningArea] = useState("");
  const [performanceLevel, setPerformanceLevel] = useState("");
  const [assessmentType, setAssessmentType] = useState("");
  const [strand, setStrand] = useState("");
  const [comments, setComments] = useState("");

  const { data: classes } = useClasses();
  const { data: students } = useStudents();
  const createAssessment = useCreateAssessment();

  const filteredStudents = students?.filter((s) => s.class_id === classId) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentYear = new Date().getFullYear().toString();
    const currentTerm = 1; // Could be dynamic based on date

    createAssessment.mutate(
      {
        student_id: studentId,
        class_id: classId,
        learning_area: learningArea,
        performance_level: performanceLevel,
        assessment_type: assessmentType,
        strand: strand || null,
        comments: comments || null,
        academic_year: currentYear,
        term: currentTerm,
      },
      {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setClassId("");
    setStudentId("");
    setLearningArea("");
    setPerformanceLevel("");
    setAssessmentType("");
    setStrand("");
    setComments("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Assessment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record CBC Assessment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    Grade {cls.grade} {cls.stream}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger>
                <SelectValue placeholder={classId ? "Select student" : "Select class first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Learning Area</Label>
            <Select value={learningArea} onValueChange={setLearningArea}>
              <SelectTrigger>
                <SelectValue placeholder="Select learning area" />
              </SelectTrigger>
              <SelectContent>
                {LEARNING_AREAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assessment Type</Label>
            <Select value={assessmentType} onValueChange={setAssessmentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Formative">Formative Assessment</SelectItem>
                <SelectItem value="Summative">Summative Assessment</SelectItem>
                <SelectItem value="Project">Project Based</SelectItem>
                <SelectItem value="Portfolio">Portfolio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Performance Level</Label>
            <Select value={performanceLevel} onValueChange={setPerformanceLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {PERFORMANCE_LEVELS.map((level) => (
                  <SelectItem key={level.level} value={level.level}>
                    {level.level} - {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Strand (Optional)</Label>
            <Select value={strand} onValueChange={setStrand}>
              <SelectTrigger>
                <SelectValue placeholder="Select strand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Numbers">Numbers</SelectItem>
                <SelectItem value="Measurement">Measurement</SelectItem>
                <SelectItem value="Geometry">Geometry</SelectItem>
                <SelectItem value="Data Handling">Data Handling</SelectItem>
                <SelectItem value="Algebra">Algebra</SelectItem>
                <SelectItem value="Listening & Speaking">Listening & Speaking</SelectItem>
                <SelectItem value="Reading">Reading</SelectItem>
                <SelectItem value="Writing">Writing</SelectItem>
                <SelectItem value="Grammar">Grammar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Teacher's comments on student performance..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!studentId || !learningArea || !performanceLevel || !assessmentType || createAssessment.isPending}
            >
              {createAssessment.isPending ? "Saving..." : "Save Assessment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
