-- Migration to convert assessment records strand/sub-strand relationships to flat text columns

-- 1. Add new text columns for learning area, strand name, and sub-strand name
ALTER TABLE public.assessment_records ADD COLUMN IF NOT EXISTS learning_area TEXT;
ALTER TABLE public.assessment_records ADD COLUMN IF NOT EXISTS strand_name TEXT;
ALTER TABLE public.assessment_records ADD COLUMN IF NOT EXISTS sub_strand_name TEXT;

-- 2. Populate these columns for existing records by joining public.sub_strands and public.strands
UPDATE public.assessment_records ar
SET 
  strand_name = s.name,
  sub_strand_name = ss.name,
  learning_area = s.learning_area
FROM public.sub_strands ss
JOIN public.strands s ON ss.strand_id = s.id
WHERE ar.sub_strand_id = ss.id;

-- 3. Drop foreign keys and clean up old columns
ALTER TABLE public.assessment_records DROP CONSTRAINT IF EXISTS assessment_records_strand_id_fkey;
ALTER TABLE public.assessment_records DROP CONSTRAINT IF EXISTS assessment_records_sub_strand_id_fkey;

ALTER TABLE public.assessment_records DROP COLUMN IF EXISTS strand_id;
ALTER TABLE public.assessment_records DROP COLUMN IF EXISTS sub_strand_id;
