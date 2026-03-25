export type SchoolCategory = "primary_junior_secondary" | "senior_secondary";

export const PRIMARY_JUNIOR_GRADES = [
  "PP1",
  "PP2",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
] as const;

export const SENIOR_SECONDARY_GRADES = [
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export const SENIOR_SECONDARY_PATHWAYS = [
  "STEM",
  "Social Sciences",
  "Arts and Sports",
] as const;

export const ALL_SCHOOL_GRADES = [
  ...PRIMARY_JUNIOR_GRADES,
  ...SENIOR_SECONDARY_GRADES,
] as const;

export function getAllowedGrades(categories: string[] | null | undefined): string[] {
  const normalized = new Set((categories || []) as SchoolCategory[]);
  if (normalized.size === 0) {
    return [...PRIMARY_JUNIOR_GRADES];
  }

  const grades: string[] = [];
  if (normalized.has("primary_junior_secondary")) {
    grades.push(...PRIMARY_JUNIOR_GRADES);
  }
  if (normalized.has("senior_secondary")) {
    grades.push(...SENIOR_SECONDARY_GRADES);
  }
  return grades;
}

export function getSchoolCategoryLabel(category: string): string {
  return category === "senior_secondary" ? "Grade 10 to Grade 12" : "PP1 to Grade 9";
}

export function getGradeBandLabel(categories: string[] | null | undefined): string {
  const normalized = new Set((categories || []) as SchoolCategory[]);
  if (normalized.has("primary_junior_secondary") && normalized.has("senior_secondary")) {
    return "PP1 to Grade 12";
  }
  if (normalized.has("senior_secondary")) {
    return "Grade 10 to Grade 12";
  }
  return "PP1 to Grade 9";
}

export function isSeniorSecondaryGrade(grade: string | null | undefined): boolean {
  return !!grade && SENIOR_SECONDARY_GRADES.includes(grade as typeof SENIOR_SECONDARY_GRADES[number]);
}
