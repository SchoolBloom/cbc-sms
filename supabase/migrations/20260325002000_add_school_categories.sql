ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS school_categories TEXT[] NOT NULL DEFAULT ARRAY['primary_junior_secondary']::TEXT[];

ALTER TABLE public.schools
DROP CONSTRAINT IF EXISTS schools_school_categories_check;

ALTER TABLE public.schools
ADD CONSTRAINT schools_school_categories_check
CHECK (
  cardinality(school_categories) > 0
  AND school_categories <@ ARRAY['primary_junior_secondary', 'senior_secondary']::TEXT[]
);
