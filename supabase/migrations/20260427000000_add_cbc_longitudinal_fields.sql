-- Add CBC Longitudinal Assessment fields to students, parents, and assessments tables
-- Migration: 20260427000000_add_cbc_longitudinal_fields.sql

-- 1. Add NEMIS/KNEC fields to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS upi_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS birth_certificate_number VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS senior_pathway VARCHAR(50) CHECK (senior_pathway IN ('STEM', 'Social_Sciences', 'Arts_Sports')),
ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255);

COMMENT ON COLUMN public.students.upi_number IS 'UPI (Unique Personal Identifier) from NEMIS portal';
COMMENT ON COLUMN public.students.birth_certificate_number IS 'Birth certificate number for NEMIS registration';
COMMENT ON COLUMN public.students.senior_pathway IS 'Senior secondary pathway selection (STEM, Social Sciences, Arts & Sports)';
COMMENT ON COLUMN public.students.previous_school IS 'Previous school name for transfer students';

-- 2. Add national ID field to parents table
ALTER TABLE public.parents 
ADD COLUMN IF NOT EXISTS national_id_number VARCHAR(50) UNIQUE;

COMMENT ON COLUMN public.parents.national_id_number IS 'National ID number for parent/guardian (NEMIS parent registration)';

-- 3. Add CBC qualitative notes to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS core_competency_notes TEXT,
ADD COLUMN IF NOT EXISTS values_notes TEXT;

COMMENT ON COLUMN public.assessments.core_competency_notes IS 'Teacher notes on core competencies (Communication, Critical Thinking, etc.)';
COMMENT ON COLUMN public.assessments.values_notes IS 'Teacher notes on CBC values (Respect, Responsibility, etc.)';

-- 4. Create index for faster lookups on new fields
CREATE INDEX IF NOT EXISTS idx_students_birth_certificate_number 
ON public.students(birth_certificate_number) WHERE birth_certificate_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_upi_number 
ON public.students(upi_number) WHERE upi_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parents_national_id_number 
ON public.parents(national_id_number) WHERE national_id_number IS NOT NULL;

-- 5. Update RLS policies if needed (admins can manage these fields)
-- Students already have proper RLS, these are just new columns
-- Parents already have proper RLS, these are just new columns  
-- Assessments already have proper RLS, these are just new columns