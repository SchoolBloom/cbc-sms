import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HistoricalAssessmentRecord {
  upi_number?: string;
  assessment_number?: string;
  full_name?: string;
  learning_area: string;
  assessment_type: string;
  performance_level: string;
  score?: number;
  strand?: string;
  comments?: string;
  term: number;
  academic_year: string;
}

interface DataIngestionDropzoneProps {
  onSuccess?: (count: number) => void;
  className?: string;
}

export function DataIngestionDropzone({ onSuccess, className }: DataIngestionDropzoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    processedCount?: number;
    errorCount?: number;
  } | null>(null);

  const processCSV = useCallback(async (file: File) => {
    setIsProcessing(true);
    setUploadResult(null);

    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const records = results.data as HistoricalAssessmentRecord[];
            
            if (!records.length) {
              throw new Error("No records found in CSV");
            }

            // Validate required fields
            const validRecords: HistoricalAssessmentRecord[] = [];
            const errors: string[] = [];

            for (let i = 0; i < records.length; i++) {
              const record = records[i];
              
              // Must have either UPI or assessment number
              if (!record.upi_number && !record.assessment_number) {
                errors.push(`Row ${i + 2}: Missing UPI or assessment number`);
                continue;
              }

              // Must have learning area and performance level
              if (!record.learning_area) {
                errors.push(`Row ${i + 2}: Missing learning area`);
                continue;
              }

              if (!record.performance_level) {
                errors.push(`Row ${i + 2}: Missing performance level`);
                continue;
              }

              validRecords.push(record);
            }

            if (validRecords.length === 0) {
              throw new Error("No valid records found in CSV");
            }

            // Find students by UPI or assessment number
            const studentIds = new Map<string, string>();
            
            const upiNumbers = validRecords
              .map((r) => r.upi_number)
              .filter(Boolean) as string[];
            const assessmentNumbers = validRecords
              .map((r) => r.assessment_number)
              .filter(Boolean) as string[];

            if (upiNumbers.length > 0) {
              const { data: studentsByUpi } = await supabase
                .from("students")
                .select("id, upi_number")
                .in("upi_number", upiNumbers);

              studentsByUpi?.forEach((student) => {
                studentIds.set(student.upi_number, student.id);
              });
            }

            if (assessmentNumbers.length > 0) {
              const { data: studentsByAssessment } = await supabase
                .from("students")
                .select("id, assessment_number")
                .in("assessment_number", assessmentNumbers);

              studentsByAssessment?.forEach((student) => {
                if (student.assessment_number) {
                  studentIds.set(student.assessment_number, student.id);
                }
              });
            }

            // Get class IDs for the students
            const studentIdArray = Array.from(studentIds.values());
            const { data: studentClasses } = await supabase
              .from("students")
              .select("id, class_id")
              .in("id", studentIdArray);

            const classIdMap = new Map<string, string>();
            studentClasses?.forEach((sc) => {
              if (sc.class_id) {
                classIdMap.set(sc.id, sc.class_id);
              }
            });

            // Build assessment inserts
            const assessmentInserts = validRecords
              .filter((record) => {
                const studentId = record.upi_number 
                  ? studentIds.get(record.upi_number!)
                  : record.assessment_number
                    ? studentIds.get(record.assessment_number!)
                    : null;
                return studentId && classIdMap.has(studentId);
              })
              .map((record) => {
                const studentId = record.upi_number
                  ? studentIds.get(record.upi_number!)
                  : studentIds.get(record.assessment_number!)!;
                const classId = classIdMap.get(studentId)!;

                return {
                  student_id: studentId,
                  class_id: classId,
                  learning_area: record.learning_area,
                  assessment_type: record.assessment_type || "Summative",
                  performance_level: record.performance_level.toLowerCase(),
                  score: record.score || null,
                  strand: record.strand || null,
                  comments: record.comments || null,
                  term: record.term || 1,
                  academic_year: record.academic_year || new Date().getFullYear().toString(),
                };
              });

            if (assessmentInserts.length === 0) {
              throw new Error("Could not match any students in the CSV to existing records");
            }

            // Batch insert
            const { error: insertError } = await supabase
              .from("assessments")
              .insert(assessmentInserts);

            if (insertError) throw insertError;

            setUploadResult({
              success: true,
              message: `Successfully imported ${assessmentInserts.length} historical assessments`,
              processedCount: assessmentInserts.length,
              errorCount: errors.length,
            });

            if (errors.length > 0) {
              console.warn("CSV processing warnings:", errors);
            }

            onSuccess?.(assessmentInserts.length);
            resolve();
          } catch (error) {
            console.error("CSV processing error:", error);
            setUploadResult({
              success: false,
              message: error instanceof Error ? error.message : "Failed to process CSV",
            });
            reject(error);
          } finally {
            setIsProcessing(false);
          }
        },
        error: (error) => {
          setUploadResult({
            success: false,
            message: "Failed to parse CSV file",
          });
          setIsProcessing(false);
          reject(error);
        },
      });
    });
  }, [onSuccess]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      await processCSV(file);
    }
  }, [processCSV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  const reset = () => {
    setUploadResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Historical Data Ingestion
        </CardTitle>
        <CardDescription>
          Upload a CSV of historical SBA scores for transfer students. 
          The CSV should contain UPI or assessment numbers to match existing students.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!uploadResult ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200 ease-in-out
              ${isDragActive 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
              }
              ${isProcessing ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Processing historical assessments...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {isDragActive ? "Drop the CSV here" : "Drag & drop a CSV file"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Required columns: upi_number OR assessment_number, learning_area, performance_level, term, academic_year
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant={uploadResult.success ? "default" : "destructive"}>
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {uploadResult.success ? "Import Successful" : "Import Failed"}
              </AlertTitle>
              <AlertDescription>{uploadResult.message}</AlertDescription>
            </Alert>

            {uploadResult.success && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {uploadResult.processedCount} assessments imported
                  </span>
                </div>
                {uploadResult.errorCount && uploadResult.errorCount > 0 && (
                  <span className="text-warning">
                    {uploadResult.errorCount} rows skipped
                  </span>
                )}
              </div>
            )}

            <Button variant="outline" onClick={reset} className="w-full">
              <X className="w-4 h-4 mr-2" />
              Upload Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}