import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLearners } from "@/hooks/useLearners";
import { useStrands } from "@/hooks/useAssessments";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface IngestionError {
  row: number;
  message: string;
}

export function SBAIngestionTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: learners = [] } = useLearners();
  const { data: strands = [] } = useStrands();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    successCount: number;
    errorCount: number;
    errors: IngestionError[];
  } | null>(null);

  // Fetch all active sub-strands
  const { data: subStrands = [] } = useQuery({
    queryKey: ["all-sub-strands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_strands")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (!file || !user) {
      toast.error("Please select a file first");
      return;
    }

    setLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data as any[];
        const errors: IngestionError[] = [];
        const validRecords: any[] = [];

        if (parsedData.length === 0) {
          setLoading(false);
          toast.error("The CSV file is empty");
          return;
        }

        // Validate each row
        for (let i = 0; i < parsedData.length; i++) {
          const row = parsedData[i];
          const rowNum = i + 2; // 1-indexed, +1 for header row

          const {
            admission_number,
            strand_code,
            sub_strand_code,
            term,
            year,
            rubric_score,
            qualitative_notes,
            core_competency_notes,
            values_notes,
          } = row;

          // 1. Validate required fields
          if (!admission_number) {
            errors.push({ row: rowNum, message: "Missing admission_number" });
            continue;
          }
          if (!strand_code) {
            errors.push({ row: rowNum, message: "Missing strand_code" });
            continue;
          }
          if (!sub_strand_code) {
            errors.push({ row: rowNum, message: "Missing sub_strand_code" });
            continue;
          }
          if (!term) {
            errors.push({ row: rowNum, message: "Missing term" });
            continue;
          }
          if (!year) {
            errors.push({ row: rowNum, message: "Missing year" });
            continue;
          }
          if (!rubric_score) {
            errors.push({ row: rowNum, message: "Missing rubric_score" });
            continue;
          }

          // 2. Lookup learner
          const learner = learners.find(
            (l) => l.admission_number.toLowerCase() === String(admission_number).trim().toLowerCase()
          );
          if (!learner) {
            errors.push({ row: rowNum, message: `Learner with Admission No '${admission_number}' not found` });
            continue;
          }

          // 3. Lookup strand
          const strand = strands.find(
            (s) => s.code.toLowerCase() === String(strand_code).trim().toLowerCase()
          );
          if (!strand) {
            errors.push({ row: rowNum, message: `Strand code '${strand_code}' not found or inactive` });
            continue;
          }

          // 4. Lookup sub-strand
          const subStrand = subStrands.find(
            (ss) => ss.code.toLowerCase() === String(sub_strand_code).trim().toLowerCase() && ss.strand_id === strand.id
          );
          if (!subStrand) {
            errors.push({ row: rowNum, message: `Sub-strand code '${sub_strand_code}' not found for strand '${strand_code}'` });
            continue;
          }

          // 5. Validate term (1, 2, 3)
          const termNum = parseInt(term);
          if (isNaN(termNum) || termNum < 1 || termNum > 3) {
            errors.push({ row: rowNum, message: `Invalid term '${term}'. Must be 1, 2, or 3.` });
            continue;
          }

          // 6. Validate year (4-digit)
          const yearStr = String(year).trim();
          if (!/^\d{4}$/.test(yearStr)) {
            errors.push({ row: rowNum, message: `Invalid year '${year}'. Must be a 4-digit year (e.g. 2026).` });
            continue;
          }

          // 7. Validate rubric score
          const validScores = ["Exceeds", "Meets", "Approaches", "Below"];
          const formattedScore = String(rubric_score).trim().charAt(0).toUpperCase() + String(rubric_score).trim().slice(1).toLowerCase();
          
          let resolvedScore = rubric_score;
          if (validScores.includes(formattedScore)) {
            resolvedScore = formattedScore;
          } else {
            errors.push({ row: rowNum, message: `Invalid rubric score '${rubric_score}'. Must be one of: Exceeds, Meets, Approaches, Below` });
            continue;
          }

          validRecords.push({
            learner_id: learner.id,
            strand_id: strand.id,
            sub_strand_id: subStrand.id,
            teacher_id: user.id,
            term: termNum,
            year: yearStr,
            rubric_score: resolvedScore,
            qualitative_notes: qualitative_notes ? String(qualitative_notes).trim() : null,
            core_competency_notes: core_competency_notes ? String(core_competency_notes).trim() : null,
            values_notes: values_notes ? String(values_notes).trim() : null,
          });
        }

        try {
          // Create batch log in database
          const { data: batch, error: batchErr } = await supabase
            .from("sba_ingestion_batches")
            .insert({
              filename: file.name,
              status: errors.length > 0 ? (validRecords.length > 0 ? "partial" : "failed") : "completed",
              total_rows: parsedData.length,
              success_count: validRecords.length,
              error_count: errors.length,
              uploaded_by: user.id,
              summary: { errors: errors.map((e) => ({ row: e.row, message: e.message })) },
            })
            .select("id")
            .single();

          if (batchErr) throw batchErr;

          // Insert valid records
          if (validRecords.length > 0) {
            const { error: insertErr } = await supabase
              .from("assessment_records")
              .insert(validRecords);
            
            if (insertErr) throw insertErr;
          }

          // Insert ingestion audits
          const auditRecords = parsedData.map((row, index) => {
            const rowNum = index + 2;
            const hasError = errors.find((e) => e.row === rowNum);
            return {
              batch_id: batch.id,
              row_number: rowNum,
              raw_data: row,
              status: hasError ? "error" : "inserted",
              error_message: hasError?.message || null,
            };
          });

          const { error: auditErr } = await supabase
            .from("ingestion_records")
            .insert(auditRecords);

          if (auditErr) throw auditErr;

          setResult({
            success: errors.length === 0,
            successCount: validRecords.length,
            errorCount: errors.length,
            errors,
          });

          if (errors.length === 0) {
            toast.success(`Successfully ingested all ${validRecords.length} records!`);
          } else if (validRecords.length > 0) {
            toast.warning(`Ingested ${validRecords.length} records, but ${errors.length} had errors.`);
          } else {
            toast.error(`Failed to ingest. All ${errors.length} records had errors.`);
          }
          
          queryClient.invalidateQueries({ queryKey: ["assessment-records"] });
        } catch (dbError: any) {
          console.error("DB error during ingestion:", dbError);
          toast.error(dbError.message || "Failed to commit assessment data to database.");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        toast.error("Failed to parse CSV file");
        setLoading(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ingest SBA Data</CardTitle>
          <CardDescription>
            Upload historical SBA records for transfer learners. CSV must include headers:
            <code className="block bg-muted/60 p-2 mt-1 rounded text-xs select-all text-foreground">
              admission_number, strand_code, sub_strand_code, term, year, rubric_score, qualitative_notes, core_competency_notes, values_notes
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
              className="flex-1 cursor-pointer"
            />
            <Button onClick={handleUpload} disabled={!file || loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Ingest
                </>
              )}
            </Button>
          </div>

          {result && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-success/5 border-success/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">{result.successCount}</p>
                    <p className="text-xs text-muted-foreground">Successful Ingests</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{result.errorCount}</p>
                    <p className="text-xs text-muted-foreground">Failed Rows</p>
                  </CardContent>
                </Card>
              </div>

              {result.successCount > 0 && (
                <Alert className="bg-success/5 text-success border-success/20">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <AlertTitle>Ingestion complete</AlertTitle>
                  <AlertDescription>
                    {result.successCount} assessment records have been written to the longitudinal profiles database.
                  </AlertDescription>
                </Alert>
              )}

              {result.errorCount > 0 && (
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Validation warnings</AlertTitle>
                    <AlertDescription>
                      {result.errorCount} rows failed validation rules. These must be corrected in the CSV and re-uploaded.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead className="w-20">Row No.</TableHead>
                          <TableHead>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((err, index) => (
                          <TableRow key={index} className="hover:bg-muted/30">
                            <TableCell className="font-semibold">{err.row}</TableCell>
                            <TableCell className="text-destructive text-sm">{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
