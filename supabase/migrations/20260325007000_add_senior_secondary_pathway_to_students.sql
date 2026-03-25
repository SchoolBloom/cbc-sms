ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS pathway TEXT;

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_pathway_check;

ALTER TABLE public.students
ADD CONSTRAINT students_pathway_check
CHECK (
  pathway IS NULL
  OR pathway IN ('STEM', 'Social Sciences', 'Arts and Sports')
);
