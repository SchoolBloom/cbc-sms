import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Assessment = Tables<"assessments">;
export type AssessmentInsert = TablesInsert<"assessments">;

export const LEARNING_AREAS_BY_LEVEL = {
  prePrimary: [
    "Language Activities",
    "Mathematical Activities",
    "Environmental Activities",
    "Psychomotor and Creative Activities",
    "Religious Education Activities",
  ],
  lowerPrimary: [
    "Kiswahili",
    "English",
    "Mathematics",
    "Religious Education",
    "Environmental Activities",
    "Creative Activities",
  ],
  upperPrimary: [
    "English",
    "Kiswahili",
    "Mathematics",
    "Science and Technology",
    "Social Studies",
    "Home Science",
    "Agriculture",
    "Creative Arts",
    "Physical and Health Education",
    "Religious Education",
  ],
  juniorSecondary: [
    "English",
    "Kiswahili",
    "Mathematics",
    "Integrated Science",
    "Pre-Technical Studies",
    "Social Studies",
    "Business Studies",
    "Agriculture",
    "Life Skills Education",
    "Physical Education and Sports",
    "Religious Education",
  ],
  seniorSecondaryCore: [
    "English",
    "Kiswahili",
    "Community Service Learning",
    "Physical Education",
  ],
  seniorSecondaryStem: [
    "Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
    "General Science",
    "Agriculture",
    "Computer Studies",
    "Home Science",
  ],
  seniorSecondarySocialSciences: [
    "History and Citizenship",
    "Geography",
    "Christian Religious Education",
    "Islamic Religious Education",
    "Hindu Religious Education",
    "Business Studies",
  ],
  seniorSecondaryArtsSports: [
    "Literature in English",
    "Fasihi ya Kiswahili",
    "Fine Arts",
    "Music and Dance",
    "Theatre and Film",
    "Sports and Recreation",
  ],
};

export const PRIMARY_JUNIOR_LEARNING_AREAS = Array.from(
  new Set([
    ...LEARNING_AREAS_BY_LEVEL.prePrimary,
    ...LEARNING_AREAS_BY_LEVEL.lowerPrimary,
    ...LEARNING_AREAS_BY_LEVEL.upperPrimary,
    ...LEARNING_AREAS_BY_LEVEL.juniorSecondary,
  ])
);

export const SENIOR_SECONDARY_LEARNING_AREAS = Array.from(
  new Set([
    ...LEARNING_AREAS_BY_LEVEL.seniorSecondaryCore,
    ...LEARNING_AREAS_BY_LEVEL.seniorSecondaryStem,
    ...LEARNING_AREAS_BY_LEVEL.seniorSecondarySocialSciences,
    ...LEARNING_AREAS_BY_LEVEL.seniorSecondaryArtsSports,
  ])
);

export const LEARNING_AREAS = Array.from(
  new Set([
    ...PRIMARY_JUNIOR_LEARNING_AREAS,
    ...SENIOR_SECONDARY_LEARNING_AREAS,
  ])
);

export function getLearningAreasForCategories(categories: string[] | null | undefined) {
  const normalized = new Set(categories || []);
  return Array.from(
    new Set([
      ...(normalized.has("primary_junior_secondary") ? PRIMARY_JUNIOR_LEARNING_AREAS : []),
      ...(normalized.has("senior_secondary") ? SENIOR_SECONDARY_LEARNING_AREAS : []),
      ...(normalized.size === 0 ? PRIMARY_JUNIOR_LEARNING_AREAS : []),
    ])
  );
}

export const PERFORMANCE_LEVELS = [
  { level: "exceeds", code: "EE", name: "Exceeding Expectations", color: "bg-success text-success-foreground" },
  { level: "meets", code: "ME", name: "Meeting Expectations", color: "bg-primary text-primary-foreground" },
  { level: "approaches", code: "AE", name: "Approaching Expectations", color: "bg-warning text-warning-foreground" },
  { level: "below", code: "BE", name: "Below Expectations", color: "bg-destructive text-destructive-foreground" },
];

export function useAssessments(classId?: string, learningArea?: string) {
  return useQuery({
    queryKey: ["assessments", classId, learningArea],
    queryFn: async () => {
      let query = supabase
        .from("assessments")
        .select(`
          *,
          student:students(id, full_name, admission_number),
          class:classes(id, grade, stream)
        `)
        .order("created_at", { ascending: false });

      if (classId) {
        query = query.eq("class_id", classId);
      }
      if (learningArea) {
        query = query.eq("learning_area", learningArea);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useStudentAssessments(studentId?: string) {
  return useQuery({
    queryKey: ["student-assessments", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("learner_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessment: AssessmentInsert) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert(assessment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessments"] });
      toast.success("Assessment recorded successfully!");
    },
    onError: (error) => {
      console.error("Error recording assessment:", error);
      toast.error("Failed to record assessment");
    },
  });
}

export function useBulkCreateAssessments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assessments: AssessmentInsert[]) => {
      const { data, error } = await supabase
        .from("assessments")
        .insert(assessments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessments saved successfully!");
    },
    onError: (error) => {
      console.error("Error saving assessments:", error);
      toast.error("Failed to save assessments");
    },
  });
}

export interface Strand {
  id: string;
  code: string;
  name: string;
  learning_area: string;
  grade_band: string;
  description: string | null;
  active: boolean;
}

export interface SubStrand {
  id: string;
  strand_id: string;
  code: string;
  name: string;
  description: string | null;
  rubric_levels: string[];
  active: boolean;
}

export interface AssessmentRecordInsert {
  learner_id: string;
  strand_id: string;
  sub_strand_id: string;
  teacher_id: string;
  term: number;
  year: string;
  rubric_score: 'Exceeds' | 'Meets' | 'Approaches' | 'Below';
  qualitative_notes?: string | null;
  core_competency_notes?: string | null;
  values_notes?: string | null;
}

export function useStrands(learningArea?: string, gradeBand?: string) {
  return useQuery({
    queryKey: ["strands", learningArea, gradeBand],
    queryFn: async () => {
      let query = supabase.from("strands").select("*").eq("active", true);
      if (learningArea) {
        query = query.eq("learning_area", learningArea);
      }
      if (gradeBand) {
        query = query.eq("grade_band", gradeBand);
      }
      const { data, error } = await query.order("code");
      if (error) throw error;
      return data as Strand[];
    },
  });
}

export function useSubStrands(strandId?: string) {
  return useQuery({
    queryKey: ["sub-strands", strandId],
    queryFn: async () => {
      if (!strandId) return [];
      const { data, error } = await supabase
        .from("sub_strands")
        .select("*")
        .eq("strand_id", strandId)
        .eq("active", true)
        .order("code");
      if (error) throw error;
      
      return (data || []).map((d: any) => ({
        ...d,
        rubric_levels: typeof d.rubric_levels === "string" 
          ? JSON.parse(d.rubric_levels) 
          : (Array.isArray(d.rubric_levels) ? d.rubric_levels : ["Exceeds", "Meets", "Approaches", "Below"])
      })) as SubStrand[];
    },
    enabled: !!strandId,
  });
}

export function useCreateAssessmentRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: AssessmentRecordInsert) => {
      const { data, error } = await supabase
        .from("assessment_records")
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment-records"] });
      queryClient.invalidateQueries({ queryKey: ["student-assessment-records"] });
      toast.success("Continuous assessment recorded successfully!");
    },
    onError: (error: Error) => {
      console.error("Error recording assessment record:", error);
      toast.error(error.message || "Failed to record assessment");
    },
  });
}

export function useAssessmentRecords(classId?: string) {
  return useQuery({
    queryKey: ["assessment-records", classId],
    queryFn: async () => {
      let query = supabase
        .from("assessment_records")
        .select(`
          *,
          learner:learners(id, full_name, admission_number, class_id),
          sub_strand:sub_strands(id, name, strand:strands(id, name, learning_area))
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (classId && data) {
        return data.filter((row: any) => row.learner?.class_id === classId);
      }

      return data;
    },
  });
}

export function useStudentAssessmentRecords(studentId?: string) {
  return useQuery({
    queryKey: ["student-assessment-records", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      
      const { data, error } = await supabase
        .from("assessment_records")
        .select(`
          *,
          sub_strand:sub_strands(id, name, strand:strands(id, name, learning_area))
        `)
        .eq("learner_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
}

