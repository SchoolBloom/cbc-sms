-- Add allocated_school_id FK to pathway_allocations for dynamic status tracking.
-- This column stores the Senior Secondary School the learner was allocated to.
-- The learner's actual school_id on the learners table represents their current school.

-- 1. Add the allocated_school_id column
ALTER TABLE public.pathway_allocations
  ADD COLUMN IF NOT EXISTS allocated_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

-- 2. Backfill from allocated_school_code → schools.code (unique match)
UPDATE public.pathway_allocations pa
SET allocated_school_id = s.id
FROM public.schools s
WHERE pa.allocated_school_code IS NOT NULL
  AND s.code = pa.allocated_school_code
  AND pa.allocated_school_id IS NULL;

-- 3. Allow SSS admins to READ allocations where their school is the allocated destination.
--    This is a cross-school read scoped only to allocations targeting their school.
DROP POLICY IF EXISTS "SSS admins can view incoming allocations" ON public.pathway_allocations;
CREATE POLICY "SSS admins can view incoming allocations" ON public.pathway_allocations
  FOR SELECT
  USING (
    allocated_school_id = public.get_user_school_id(auth.uid())
    OR public.is_system_admin(auth.uid())
  );
