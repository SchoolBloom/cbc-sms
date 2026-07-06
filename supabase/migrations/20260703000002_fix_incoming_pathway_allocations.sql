-- Fix incoming pathway allocations not appearing on SSS admin dashboards.
-- Root cause: client-side school lookup fails because JSS admins cannot read other
-- schools via RLS, so allocated_school_id was never populated. Resolve server-side.

CREATE OR REPLACE FUNCTION public.resolve_pathway_allocated_school()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trimmed_code TEXT;
  resolved_id UUID;
  resolved_name TEXT;
BEGIN
  trimmed_code := NULLIF(TRIM(NEW.allocated_school_code), '');
  IF trimmed_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.allocated_school_code IS NOT DISTINCT FROM OLD.allocated_school_code
     AND NEW.allocated_school_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.id, s.name
  INTO resolved_id, resolved_name
  FROM public.schools s
  WHERE s.knec_code = trimmed_code
  LIMIT 1;

  IF resolved_id IS NULL THEN
    SELECT s.id, s.name
    INTO resolved_id, resolved_name
    FROM public.schools s
    WHERE s.code = trimmed_code
    LIMIT 1;
  END IF;

  IF resolved_id IS NULL THEN
    SELECT s.id, s.name
    INTO resolved_id, resolved_name
    FROM public.schools s
    WHERE s.nemis_code = trimmed_code
    LIMIT 1;
  END IF;

  IF resolved_id IS NOT NULL THEN
    NEW.allocated_school_id := resolved_id;
    IF NEW.allocated_school_name IS NULL OR TRIM(NEW.allocated_school_name) = '' THEN
      NEW.allocated_school_name := resolved_name;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resolve_pathway_allocated_school_trigger ON public.pathway_allocations;
CREATE TRIGGER resolve_pathway_allocated_school_trigger
BEFORE INSERT OR UPDATE OF allocated_school_code, allocated_school_name, allocated_school_id
ON public.pathway_allocations
FOR EACH ROW
EXECUTE FUNCTION public.resolve_pathway_allocated_school();

-- Backfill existing rows that have a code but no resolved destination school
UPDATE public.pathway_allocations pa
SET
  allocated_school_id = s.id,
  allocated_school_name = COALESCE(NULLIF(TRIM(pa.allocated_school_name), ''), s.name)
FROM public.schools s
WHERE pa.allocated_school_code IS NOT NULL
  AND TRIM(pa.allocated_school_code) <> ''
  AND (
    pa.allocated_school_id IS NULL
    OR pa.allocated_school_id IS DISTINCT FROM s.id
  )
  AND (
    s.knec_code = TRIM(pa.allocated_school_code)
    OR s.code = TRIM(pa.allocated_school_code)
    OR s.nemis_code = TRIM(pa.allocated_school_code)
  );

-- Expand SSS read policy: match by allocated_school_id OR by school code fields
DROP POLICY IF EXISTS "SSS admins can view incoming allocations" ON public.pathway_allocations;
CREATE POLICY "SSS admins can view incoming allocations" ON public.pathway_allocations
  FOR SELECT
  USING (
    public.is_system_admin(auth.uid())
    OR allocated_school_id = public.get_user_school_id(auth.uid())
    OR (
      allocated_school_code IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.schools s
        WHERE s.id = public.get_user_school_id(auth.uid())
          AND (
            s.knec_code = TRIM(allocated_school_code)
            OR s.code = TRIM(allocated_school_code)
            OR s.nemis_code = TRIM(allocated_school_code)
          )
      )
    )
  );

-- Allow SSS admins to read learner records allocated to their school
DROP POLICY IF EXISTS "SSS admins can view incoming allocated learners" ON public.learners;
CREATE POLICY "SSS admins can view incoming allocated learners" ON public.learners
  FOR SELECT
  USING (
    public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.pathway_allocations pa
      WHERE pa.learner_id = learners.id
        AND (
          pa.allocated_school_id = public.get_user_school_id(auth.uid())
          OR (
            pa.allocated_school_code IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.schools s
              WHERE s.id = public.get_user_school_id(auth.uid())
                AND (
                  s.knec_code = TRIM(pa.allocated_school_code)
                  OR s.code = TRIM(pa.allocated_school_code)
                  OR s.nemis_code = TRIM(pa.allocated_school_code)
                )
            )
          )
        )
    )
  );

-- Allow SSS admins to read class info for incoming allocated learners
DROP POLICY IF EXISTS "SSS admins can view classes of incoming learners" ON public.classes;
CREATE POLICY "SSS admins can view classes of incoming learners" ON public.classes
  FOR SELECT
  USING (
    public.is_system_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.learners l
      JOIN public.pathway_allocations pa ON pa.learner_id = l.id
      WHERE l.class_id = classes.id
        AND (
          pa.allocated_school_id = public.get_user_school_id(auth.uid())
          OR (
            pa.allocated_school_code IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.schools s
              WHERE s.id = public.get_user_school_id(auth.uid())
                AND (
                  s.knec_code = TRIM(pa.allocated_school_code)
                  OR s.code = TRIM(pa.allocated_school_code)
                  OR s.nemis_code = TRIM(pa.allocated_school_code)
                )
            )
          )
        )
    )
  );
