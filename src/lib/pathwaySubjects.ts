import { useMemo } from "react";
import { SENIOR_SECONDARY_PATHWAYS } from "@/lib/schoolCategories";

/**
 * Subject categories for senior secondary pathways
 * Based on Kenyan CBC curriculum
 */
export const PATHWAY_SUBJECTS = {
  STEM: [
    "Mathematics",
    "Biology",
    "Chemistry",
    "Physics",
    "General Science",
    "Agriculture",
    "Computer Studies",
    "Home Science",
    "Technical Studies",
  ],
  Social_Sciences: [
    "History and Citizenship",
    "Geography",
    "Christian Religious Education",
    "Islamic Religious Education",
    "Hindu Religious Education",
    "Business Studies",
    "Agriculture",
    "Home Science",
  ],
  Arts_Sports: [
    "Literature in English",
    "Kiswahili",
    "Music",
    "Art and Design",
    "Physical Education",
    "Sports",
    "Drama",
    "Photography",
    "Fashion and Design",
    "Culinary Arts",
  ],
} as const;

/**
 * Map old pathway names to new enum values
 */
export const PATHWAY_MAP: Record<string, keyof typeof PATHWAY_SUBJECTS> = {
  STEM: "STEM",
  "Social Sciences": "Social_Sciences",
  "Arts and Sports": "Arts_Sports",
};

/**
 * Get the pathway key from a display name
 */
export function getPathwayKey(pathway: string | null | undefined): keyof typeof PATHWAY_SUBJECTS | null {
  if (!pathway) return null;
  
  // Handle old display names
  if (pathway === "STEM") return "STEM";
  if (pathway === "Social Sciences") return "Social_Sciences";
  if (pathway === "Arts and Sports") return "Arts_Sports";
  
  // Handle enum values
  if (pathway in PATHWAY_SUBJECTS) {
    return pathway as keyof typeof PATHWAY_SUBJECTS;
  }
  
  return null;
}

/**
 * Get subjects available for a specific pathway
 */
export function getSubjectsForPathway(pathway: string | null | undefined): string[] {
  const key = getPathwayKey(pathway);
  if (!key) return [];
  return PATHWAY_SUBJECTS[key] || [];
}

/**
 * Check if a subject belongs to a specific pathway
 */
export function isSubjectInPathway(subjectName: string, pathway: string | null | undefined): boolean {
  const subjects = getSubjectsForPathway(pathway);
  return subjects.some(
    (s) => s.toLowerCase() === subjectName.toLowerCase()
  );
}

/**
 * Filter subjects based on a student's pathway
 * Returns only subjects that align with the pathway
 */
export function filterSubjectsByPathway<T extends { name?: string }>(
  subjects: T[],
  pathway: string | null | undefined
): T[] {
  if (!pathway) return subjects;
  
  const pathwaySubjects = getSubjectsForPathway(pathway);
  
  return subjects.filter((subject) => {
    const subjectName = subject.name?.toLowerCase() || "";
    return pathwaySubjects.some(
      (ps) => ps.toLowerCase() === subjectName
    );
  });
}

/**
 * Get all available subjects for senior secondary
 * (union of all pathways)
 */
export function getAllSeniorSecondarySubjects(): string[] {
  const allSubjects = new Set<string>();
  
  Object.values(PATHWAY_SUBJECTS).forEach((subjects) => {
    subjects.forEach((subject) => allSubjects.add(subject));
  });
  
  return Array.from(allSubjects).sort();
}

/**
 * Get pathway display name from enum value
 */
export function getPathwayDisplayName(pathway: string | null | undefined): string {
  if (!pathway) return "Not selected";
  
  switch (pathway) {
    case "STEM":
      return "STEM (Science, Technology, Engineering, Mathematics)";
    case "Social_Sciences":
      return "Social Sciences";
    case "Arts_Sports":
      return "Arts & Sports";
    default:
      return pathway;
  }
}

/**
 * Validate if a subject assignment is valid for a student's pathway
 */
export function validateSubjectPathway(
  subjectName: string,
  studentPathway: string | null,
  studentGrade: string | null
): { valid: boolean; message?: string } {
  // Only apply pathway filtering for Grade 10+
  const seniorSecondaryGrades = ["Grade 10", "Grade 11", "Grade 12"];
  const isSeniorSecondary = studentGrade && seniorSecondaryGrades.includes(studentGrade);
  
  if (!isSeniorSecondary) {
    return { valid: true };
  }
  
  if (!studentPathway) {
    return { 
      valid: false, 
      message: "Student must have a pathway selected before assigning subjects" 
    };
  }
  
  const isValid = isSubjectInPathway(subjectName, studentPathway);
  
  if (!isValid) {
    const pathwaySubjects = getSubjectsForPathway(studentPathway);
    return {
      valid: false,
      message: `${subjectName} is not available for the ${studentPathway} pathway. Available subjects: ${pathwaySubjects.join(", ")}`,
    };
  }
  
  return { valid: true };
}