-- Reliable incoming pathway allocations for SSS admins.
-- Uses SECURITY DEFINER RPC to bypass cross-school RLS and circular policy checks.

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
  WHERE s.knec_code IS NOT NULL
    AND UPPER(TRIM(s.knec_code)) = UPPER(trimmed_code)
  LIMIT 1;

  IF resolved_id IS NULL THEN
    SELECT s.id, s.name
    INTO resolved_id, resolved_name
    FROM public.schools s
    WHERE s.code IS NOT NULL
      AND UPPER(TRIM(s.code)) = UPPER(trimmed_code)
    LIMIT 1;
  END IF;

  IF resolved_id IS NULL THEN
    SELECT s.id, s.name
    INTO resolved_id, resolved_name
    FROM public.schools s
    WHERE s.nemis_code IS NOT NULL
      AND UPPER(TRIM(s.nemis_code)) = UPPER(trimmed_code)
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

-- Backfill with case-insensitive code matching
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
    (s.knec_code IS NOT NULL AND UPPER(TRIM(s.knec_code)) = UPPER(TRIM(pa.allocated_school_code)))
    OR (s.code IS NOT NULL AND UPPER(TRIM(s.code)) = UPPER(TRIM(pa.allocated_school_code)))
    OR (s.nemis_code IS NOT NULL AND UPPER(TRIM(s.nemis_code)) = UPPER(TRIM(pa.allocated_school_code)))
  );

CREATE OR REPLACE FUNCTION public.get_incoming_pathway_allocations(p_school_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  v_school_id := COALESCE(p_school_id, public.get_user_school_id(auth.uid()));
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'School context required.';
  END IF;

  IF NOT (public.is_school_admin(auth.uid(), v_school_id) OR public.is_system_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied. You must be an administrator of the receiving school.';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      pa.id,
      pa.school_id,
      pa.learner_id,
      pa.pathway,
      pa.academic_year,
      pa.kjsea_score,
      pa.allocation_source,
      pa.finalized,
      pa.finalized_at,
      pa.finalized_by,
      pa.notes,
      pa.allocated_school_name,
      pa.allocated_school_code,
      COALESCE(pa.allocated_school_id, v_school_id) AS allocated_school_id,
      pa.created_at,
      pa.updated_at,
      json_build_object(
        'id', l.id,
        'full_name', l.full_name,
        'admission_number', l.admission_number,
        'school_id', l.school_id,
        'upi_number', l.upi_number,
        'assessment_number', l.assessment_number,
        'status', l.status,
        'classes', CASE
          WHEN c.id IS NULL THEN NULL
          ELSE json_build_object('grade', c.grade, 'stream', c.stream)
        END
      ) AS learner,
      json_build_object(
        'id', COALESCE(dest_school.id, my_school.id),
        'name', COALESCE(dest_school.name, my_school.name)
      ) AS allocated_school,
      CASE
        WHEN l.school_id = v_school_id THEN
          json_build_object('id', my_school.id, 'name', my_school.name)
        WHEN l.school_id IS NOT NULL AND l.school_id <> v_school_id THEN
          json_build_object('id', origin_school.id, 'name', origin_school.name)
        ELSE NULL
      END AS learner_current_school
    FROM public.pathway_allocations pa
    JOIN public.learners l ON l.id = pa.learner_id
    JOIN public.schools my_school ON my_school.id = v_school_id
    LEFT JOIN public.classes c ON c.id = l.class_id
    LEFT JOIN public.schools dest_school ON dest_school.id = pa.allocated_school_id
    LEFT JOIN public.schools origin_school ON origin_school.id = l.school_id
    WHERE
      pa.allocated_school_id = v_school_id
      OR (
        pa.allocated_school_code IS NOT NULL
        AND TRIM(pa.allocated_school_code) <> ''
        AND (
          (my_school.knec_code IS NOT NULL AND UPPER(TRIM(my_school.knec_code)) = UPPER(TRIM(pa.allocated_school_code)))
          OR (my_school.code IS NOT NULL AND UPPER(TRIM(my_school.code)) = UPPER(TRIM(pa.allocated_school_code)))
          OR (my_school.nemis_code IS NOT NULL AND UPPER(TRIM(my_school.nemis_code)) = UPPER(TRIM(pa.allocated_school_code)))
        )
      )
  ) t;

  RETURN v_result;
END;
$$;

DROP POLICY IF EXISTS "SSS admins can view incoming allocated learners" ON public.learners;
DROP POLICY IF EXISTS "SSS admins can view classes of incoming learners" ON public.classes;
