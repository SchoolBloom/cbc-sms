CREATE OR REPLACE FUNCTION public.assign_teacher_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT p.school_id
    INTO NEW.school_id
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.current_user_school_id();
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.teachers t
SET school_id = p.school_id
FROM public.profiles p
WHERE t.user_id = p.user_id
  AND t.school_id IS NULL
  AND p.school_id IS NOT NULL;

UPDATE public.profiles p
SET school_id = t.school_id
FROM public.teachers t
WHERE p.user_id = t.user_id
  AND p.school_id IS NULL
  AND t.school_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_teachers_school_id ON public.teachers;
CREATE TRIGGER set_teachers_school_id
BEFORE INSERT OR UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.assign_teacher_school_id();
