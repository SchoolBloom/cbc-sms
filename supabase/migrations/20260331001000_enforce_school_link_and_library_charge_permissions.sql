CREATE OR REPLACE FUNCTION public.claim_profile_school_from_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
  requires_school BOOLEAN;
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT COALESCE(
      (
        SELECT t.school_id
        FROM public.teachers t
        WHERE t.user_id = NEW.user_id
        LIMIT 1
      ),
      (
        SELECT p.school_id
        FROM public.parents p
        WHERE p.user_id = NEW.user_id
        LIMIT 1
      ),
      (
        SELECT s.id
        FROM public.schools s
        WHERE s.admin_user_id = NEW.user_id
        LIMIT 1
      )
    )
    INTO resolved_school_id;

    IF resolved_school_id IS NULL
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'bursar')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'librarian')
      )
    THEN
      resolved_school_id := public.current_user_school_id();
    END IF;

    NEW.school_id := resolved_school_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role <> 'system_admin'
  )
  INTO requires_school;

  IF requires_school AND NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Accounts with a school role must be linked to a school';
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
  IF NEW.role = 'system_admin' THEN
    RETURN NEW;
  END IF;

  SELECT p.school_id
  INTO resolved_school_id
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  IF resolved_school_id IS NULL AND NEW.role = 'teacher' THEN
    SELECT t.school_id
    INTO resolved_school_id
    FROM public.teachers t
    WHERE t.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL AND NEW.role = 'parent' THEN
    SELECT p.school_id
    INTO resolved_school_id
    FROM public.parents p
    WHERE p.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL AND NEW.role = 'admin' THEN
    SELECT s.id
    INTO resolved_school_id
    FROM public.schools s
    WHERE s.admin_user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL THEN
    resolved_school_id := public.current_user_school_id();
  END IF;

  IF resolved_school_id IS NULL THEN
    RAISE EXCEPTION 'Cannot assign role % without linking the account to a school', NEW.role;
  END IF;

  UPDATE public.profiles
  SET school_id = resolved_school_id
  WHERE user_id = NEW.user_id
    AND school_id IS NULL;

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE p.user_id = s.admin_user_id
  AND p.school_id IS NULL;

UPDATE public.profiles p
SET school_id = t.school_id
FROM public.teachers t
WHERE p.user_id = t.user_id
  AND p.school_id IS NULL
  AND t.school_id IS NOT NULL;

UPDATE public.profiles p
SET school_id = pa.school_id
FROM public.parents pa
WHERE p.user_id = pa.user_id
  AND p.school_id IS NULL
  AND pa.school_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_profiles_school_id_from_actor ON public.profiles;
CREATE TRIGGER set_profiles_school_id_from_actor
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_profile_school_from_actor();

DROP TRIGGER IF EXISTS sync_role_holder_school_id ON public.user_roles;
CREATE TRIGGER sync_role_holder_school_id
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_role_holder_school_id();

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School admins and librarians can manage library settings" ON public.library_settings;
CREATE POLICY "School admins and librarians can manage library settings" ON public.library_settings
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  )
  WITH CHECK (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );
