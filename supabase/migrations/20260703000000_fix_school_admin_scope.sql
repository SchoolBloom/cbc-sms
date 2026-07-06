-- Ensure school admins linked via schools.admin_user_id can manage school-scoped data.
-- get_user_school_id previously missed this path, causing RLS failures on inserts/updates.

CREATE OR REPLACE FUNCTION public.get_user_school_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  -- 1. Try profiles
  SELECT school_id INTO resolved_school_id FROM public.profiles WHERE user_id = user_uuid;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 2. Try user_roles (admin role first, then any role with a school)
  SELECT school_id INTO resolved_school_id
  FROM public.user_roles
  WHERE user_id = user_uuid
    AND school_id IS NOT NULL
  ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END
  LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 3. Try schools where the user is the designated administrator
  SELECT id INTO resolved_school_id
  FROM public.schools
  WHERE admin_user_id = user_uuid
  LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 4. Try teachers
  SELECT school_id INTO resolved_school_id FROM public.teachers WHERE user_id = user_uuid LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 5. Try parents
  SELECT school_id INTO resolved_school_id FROM public.parents WHERE user_id = user_uuid LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(user_uuid UUID, school_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF school_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Direct school administrator link (covers legacy rows missing user_roles/profile school_id)
  IF EXISTS (
    SELECT 1 FROM public.schools
    WHERE id = school_uuid AND admin_user_id = user_uuid
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
      AND role = 'admin'
      AND (
        school_id = school_uuid
        OR public.get_user_school_id(user_uuid) = school_uuid
      )
  );
END;
$$;
