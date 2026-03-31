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
        .eq("student_id", studentId)
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
