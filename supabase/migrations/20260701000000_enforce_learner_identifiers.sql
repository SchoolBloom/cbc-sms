-- Enforce global and school-level uniqueness on learner identifiers.
-- PostgreSQL natively allows multiple NULLs in UNIQUE constraints, so nullable
-- columns (upi_number, assessment_number) do not need special handling.

-- 1. Globally unique UPI number (NEMIS Unique Pupil Identifier)
CREATE UNIQUE INDEX IF NOT EXISTS uq_learners_upi_number
  ON public.learners (upi_number)
  WHERE upi_number IS NOT NULL;

-- 2. Globally unique KNEC Assessment Number
CREATE UNIQUE INDEX IF NOT EXISTS uq_learners_assessment_number
  ON public.learners (assessment_number)
  WHERE assessment_number IS NOT NULL;

-- 3. Admission numbers are unique per school (composite constraint)
--    Uses a partial index to avoid issues if either column is NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_learners_school_admission
  ON public.learners (school_id, admission_number)
  WHERE school_id IS NOT NULL;
