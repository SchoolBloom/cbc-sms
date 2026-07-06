-- Resolve pathway allocation destination schools using KNEC school codes.
-- allocated_school_code stores the KNEC code entered during KJSEA placement.

-- Prefer KNEC code match (primary identifier for senior secondary schools)
UPDATE public.pathway_allocations pa
SET allocated_school_id = s.id
FROM public.schools s
WHERE pa.allocated_school_code IS NOT NULL
  AND s.knec_code IS NOT NULL
  AND s.knec_code = pa.allocated_school_code
  AND (pa.allocated_school_id IS DISTINCT FROM s.id);

-- Fallback for legacy rows that used internal school codes
UPDATE public.pathway_allocations pa
SET allocated_school_id = s.id
FROM public.schools s
WHERE pa.allocated_school_code IS NOT NULL
  AND pa.allocated_school_id IS NULL
  AND s.code = pa.allocated_school_code;
