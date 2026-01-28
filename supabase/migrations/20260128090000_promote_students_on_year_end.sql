-- Promote students when a new academic year is set as current
CREATE OR REPLACE FUNCTION public.promote_students(_from_year TEXT, _to_year TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure next-year classes exist (same streams, next grade)
  INSERT INTO public.classes (grade, stream, academic_year, term)
  SELECT DISTINCT
    CASE c.grade
      WHEN 'PP1' THEN 'PP2'
      WHEN 'PP2' THEN 'Grade 1'
      WHEN 'Grade 1' THEN 'Grade 2'
      WHEN 'Grade 2' THEN 'Grade 3'
      WHEN 'Grade 3' THEN 'Grade 4'
      WHEN 'Grade 4' THEN 'Grade 5'
      WHEN 'Grade 5' THEN 'Grade 6'
      WHEN 'Grade 6' THEN 'Grade 7'
      WHEN 'Grade 7' THEN 'Grade 8'
      WHEN 'Grade 8' THEN 'Grade 9'
      ELSE NULL
    END AS next_grade,
    c.stream,
    _to_year,
    1
  FROM public.classes c
  WHERE c.academic_year = _from_year
    AND c.grade <> 'Grade 9'
  ON CONFLICT (grade, stream, academic_year) DO NOTHING;

  -- Promote active students to next grade
  UPDATE public.students s
  SET class_id = c_new.id
  FROM public.classes c_old
  JOIN public.classes c_new
    ON c_new.stream = c_old.stream
   AND c_new.academic_year = _to_year
   AND c_new.grade = CASE c_old.grade
      WHEN 'PP1' THEN 'PP2'
      WHEN 'PP2' THEN 'Grade 1'
      WHEN 'Grade 1' THEN 'Grade 2'
      WHEN 'Grade 2' THEN 'Grade 3'
      WHEN 'Grade 3' THEN 'Grade 4'
      WHEN 'Grade 4' THEN 'Grade 5'
      WHEN 'Grade 5' THEN 'Grade 6'
      WHEN 'Grade 6' THEN 'Grade 7'
      WHEN 'Grade 7' THEN 'Grade 8'
      WHEN 'Grade 8' THEN 'Grade 9'
      ELSE NULL
    END
  WHERE s.class_id = c_old.id
    AND c_old.academic_year = _from_year
    AND c_old.grade <> 'Grade 9'
    AND s.status = 'active';

  -- Mark Grade 9 students as completed
  UPDATE public.students s
  SET status = 'completed',
      class_id = NULL
  FROM public.classes c_old
  WHERE s.class_id = c_old.id
    AND c_old.academic_year = _from_year
    AND c_old.grade = 'Grade 9'
    AND s.status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_students_on_new_academic_year()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_year TEXT;
BEGIN
  IF NEW.is_current IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_current IS DISTINCT FROM NEW.is_current) THEN
    SELECT label
      INTO from_year
    FROM public.academic_years
    WHERE id <> NEW.id
      AND end_date < CURRENT_DATE
    ORDER BY end_date DESC
    LIMIT 1;

    IF from_year IS NOT NULL THEN
      PERFORM public.promote_students(from_year, NEW.label);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promote_students_on_new_academic_year ON public.academic_years;
CREATE TRIGGER promote_students_on_new_academic_year
  AFTER INSERT OR UPDATE OF is_current ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.promote_students_on_new_academic_year();
