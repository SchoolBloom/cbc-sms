import Papa from "papaparse";

/**
 * NEMIS Registration CSV format for new student admissions
 * Required fields: birth_certificate_number, parent_national_id
 */
export interface NEMISStudentRecord {
  admission_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  birth_certificate_number: string;
  parent_national_id: string;
  previous_school?: string;
}

/**
 * Fetch students without UPI numbers for NEMIS registration
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function fetchStudentsForNEMISExport(
  supabase: SupabaseClient<Database>
): Promise<NEMISStudentRecord[]> {
  const { data: students, error } = await supabase
    .from("learners")
    .select(`
      admission_number,
      full_name,
      date_of_birth,
      gender,
      birth_certificate_number,
      previous_school,
      parents:parent_id (national_id_number),
      secondary_parent:parent_id_secondary (national_id_number)
    `)
    .is("upi_number", null)
    .not("birth_certificate_number", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (students || []).map((student: any) => ({
    admission_number: student.admission_number,
    full_name: student.full_name,
    date_of_birth: student.date_of_birth,
    gender: student.gender === "male" ? "M" : "F",
    birth_certificate_number: student.birth_certificate_number || "",
    parent_national_id: student.parents?.national_id_number || "",
    previous_school: student.previous_school || "",
  }));
}

/**
 * Download NEMIS registration CSV
 */
export function downloadNEMISExport(records: NEMISStudentRecord[], filename?: string): void {
  const csv = Papa.unparse(records, {
    columns: [
      "admission_number",
      "full_name",
      "date_of_birth",
      "gender",
      "birth_certificate_number",
      "parent_national_id",
      "previous_school",
    ],
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `nemis_registration_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * KNEC CBA Assessment CSV format
 */
export interface KNECAssessmentRecord {
  upi_number: string;
  assessment_number: string;
  grade: string;
  term: number;
  academic_year: string;
  learning_area: string;
  assessment_type: string;
  performance_level: string;
  score?: number;
  core_competency_notes?: string;
  values_notes?: string;
}

/**
 * Fetch finalized assessments for KNEC export
 */
export async function fetchAssessmentsForKNECExport(
  supabase: SupabaseClient<Database>,
  grade: string,
  term?: number,
  academicYear?: string
): Promise<KNECAssessmentRecord[]> {
  const currentYear = academicYear || new Date().getFullYear().toString();
  const currentTerm = term || 1;

  // First get the class IDs for the specified grade
  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("grade", grade);

  if (!classes || classes.length === 0) {
    return [];
  }

  const classIds = classes.map((c) => c.id);

  const { data: assessments, error } = await supabase
    .from("assessments")
    .select(`
      term,
      academic_year,
      learning_area,
      assessment_type,
      performance_level,
      score,
      core_competency_notes,
      values_notes,
      learner:learners (
        upi_number,
        assessment_number
      ),
      class:classes (grade)
    `)
    .in("class_id", classIds)
    .eq("term", currentTerm)
    .eq("academic_year", currentYear);

  if (error) throw error;

  return (assessments || [])
    .filter((a) => a.learner?.upi_number)
    .map((assessment) => ({
      upi_number: assessment.learner?.upi_number || "",
      assessment_number: assessment.learner?.assessment_number || "",
      grade: assessment.class?.grade || grade,
      term: assessment.term,
      academic_year: assessment.academic_year,
      learning_area: assessment.learning_area,
      assessment_type: assessment.assessment_type,
      performance_level: assessment.performance_level,
      score: assessment.score,
      core_competency_notes: assessment.core_competency_notes || "",
      values_notes: assessment.values_notes || "",
    }));
}

/**
 * Download KNEC CBA CSV
 */
export function downloadKNECExport(records: KNECAssessmentRecord[], grade: string, filename?: string): void {
  const csv = Papa.unparse(records, {
    columns: [
      "upi_number",
      "assessment_number",
      "grade",
      "term",
      "academic_year",
      "learning_area",
      "assessment_type",
      "performance_level",
      "score",
      "core_competency_notes",
      "values_notes",
    ],
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `knec_cba_grade_${grade}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * KNEC Registration CSV format for students without assessment numbers
 */
export interface KNECLearnerRecord {
  admission_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  birth_certificate_number: string;
  upi_number: string;
  grade: string;
}

/**
 * Fetch learners without KNEC assessment numbers for KNEC registration
 */
export async function fetchLearnersForKNECExport(
  supabase: SupabaseClient<Database>
): Promise<KNECLearnerRecord[]> {
  const { data: learners, error } = await supabase
    .from("learners")
    .select(`
      admission_number,
      full_name,
      date_of_birth,
      gender,
      birth_certificate_number,
      upi_number,
      classes:class_id (grade)
    `)
    .is("assessment_number", null)
    .not("birth_certificate_number", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (learners || []).map((learner: any) => ({
    admission_number: learner.admission_number,
    full_name: learner.full_name,
    date_of_birth: learner.date_of_birth,
    gender: learner.gender === "male" ? "M" : "F",
    birth_certificate_number: learner.birth_certificate_number || "",
    upi_number: learner.upi_number || "",
    grade: learner.classes?.grade || "",
  }));
}

/**
 * Download KNEC registration CSV
 */
export function downloadKNECRegistrationExport(records: KNECLearnerRecord[], filename?: string): void {
  const csv = Papa.unparse(records, {
    columns: [
      "admission_number",
      "full_name",
      "date_of_birth",
      "gender",
      "birth_certificate_number",
      "upi_number",
      "grade",
    ],
    header: true,
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename || `knec_registration_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}