import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchStudentsForNEMISExport,
  downloadNEMISExport,
  fetchAssessmentsForKNECExport,
  downloadKNECExport,
  fetchLearnersForKNECExport,
  downloadKNECRegistrationExport,
} from "@/lib/nemisKnecExport";
import { SENIOR_SECONDARY_GRADES } from "@/lib/schoolCategories";
import { toast } from "sonner";

interface ExportButtonsProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabels?: boolean;
}

export function NEMISExportButton({ variant = "outline", size = "sm", showLabels = true }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const students = await fetchStudentsForNEMISExport(supabase);
      
      if (students.length === 0) {
        toast.info("No students found without UPI numbers. All students may already be registered.");
        return;
      }

      downloadNEMISExport(students);
      toast.success(`Exported ${students.length} students for NEMIS registration`);
    } catch (error) {
      console.error("NEMIS export error:", error);
      toast.error("Failed to export NEMIS data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {showLabels && "Export NEMIS"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export NEMIS Registration</AlertDialogTitle>
          <AlertDialogDescription>
            This will export all students without UPI numbers who have a birth certificate number.
            The CSV will be formatted for upload to the NEMIS portal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function KNECExportButton({ variant = "outline", size = "sm", showLabels = true }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [showDialog, setShowDialog] = useState(false);

  const handleExport = async () => {
    if (!selectedGrade) {
      toast.error("Please select a grade");
      return;
    }

    setIsExporting(true);
    try {
      const assessments = await fetchAssessmentsForKNECExport(supabase, selectedGrade);
      
      if (assessments.length === 0) {
        toast.info(`No assessments found for Grade ${selectedGrade}. Make sure assessments have been recorded.`);
        return;
      }

      downloadKNECExport(assessments, selectedGrade);
      toast.success(`Exported ${assessments.length} assessments for KNEC`);
      setShowDialog(false);
      setSelectedGrade("");
    } catch (error) {
      console.error("KNEC export error:", error);
      toast.error("Failed to export KNEC data");
    } finally {
      setIsExporting(false);
    }
  };

  // Get all grades including primary/junior secondary
  const allGrades = [
    "PP1", "PP2", 
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
    "Grade 7", "Grade 8", "Grade 9",
    ...SENIOR_SECONDARY_GRADES
  ];

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        className="gap-2"
        onClick={() => setShowDialog(true)}
      >
        <FileSpreadsheet className="w-4 h-4" />
        {showLabels && "Export KNEC CBA"}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export KNEC CBA</AlertDialogTitle>
            <AlertDialogDescription>
              Select a grade to export finalized assessments for KNEC upload.
              This includes performance levels, scores, and qualitative notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {allGrades.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedGrade("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExport} 
              disabled={isExporting || !selectedGrade}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function KNECRegistrationExportButton({ variant = "outline", size = "sm", showLabels = true }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const learners = await fetchLearnersForKNECExport(supabase);
      
      if (learners.length === 0) {
        toast.info("No learners found without KNEC assessment numbers. All learners may already be registered.");
        return;
      }

      downloadKNECRegistrationExport(learners);
      toast.success(`Exported ${learners.length} learners for KNEC registration`);
    } catch (error) {
      console.error("KNEC registration export error:", error);
      toast.error("Failed to export KNEC registration data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {showLabels && "Export KNEC Registration"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Export KNEC Registration</AlertDialogTitle>
          <AlertDialogDescription>
            This will export all learners without KNEC assessment numbers who have a birth certificate number.
            The CSV will be formatted for upload to the KNEC portal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export CSV"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}