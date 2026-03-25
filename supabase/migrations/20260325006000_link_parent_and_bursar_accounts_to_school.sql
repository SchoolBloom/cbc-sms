CREATE OR REPLACE FUNCTION public.assign_parent_school_id()
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

CREATE OR REPLACE FUNCTION public.sync_role_holder_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  IF NEW.role NOT IN ('parent', 'bursar') THEN
    RETURN NEW;
  END IF;

  SELECT p.school_id
  INTO resolved_school_id
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  IF resolved_school_id IS NULL AND NEW.role = 'parent' THEN
    SELECT parent_record.school_id
    INTO resolved_school_id
    FROM public.parents parent_record
    WHERE parent_record.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL THEN
    resolved_school_id := public.current_user_school_id();
  END IF;

  IF resolved_school_id IS NOT NULL THEN
    UPDATE public.profiles
    SET school_id = resolved_school_id
    WHERE user_id = NEW.user_id
      AND school_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.parents parent_record
SET school_id = p.school_id
FROM public.profiles p
WHERE parent_record.user_id = p.user_id
  AND parent_record.school_id IS NULL
  AND p.school_id IS NOT NULL;

UPDATE public.profiles p
SET school_id = parent_record.school_id
FROM public.parents parent_record
WHERE p.user_id = parent_record.user_id
  AND p.school_id IS NULL
  AND parent_record.school_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_parents_school_id ON public.parents;
CREATE TRIGGER set_parents_school_id
BEFORE INSERT OR UPDATE ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.assign_parent_school_id();

DROP TRIGGER IF EXISTS sync_role_holder_school_id ON public.user_roles;
CREATE TRIGGER sync_role_holder_school_id
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_holder_school_id();
