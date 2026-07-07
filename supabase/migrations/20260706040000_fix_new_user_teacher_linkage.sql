-- Fix handle_new_user function to automatically link a newly registered user
-- to their existing teacher or parent record based on email match, and assign them
-- the correct role and school_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_teacher_exists BOOLEAN := FALSE;
  v_parent_exists BOOLEAN := FALSE;
BEGIN
  -- Check if there is an existing teacher with this email
  SELECT school_id, TRUE INTO v_school_id, v_teacher_exists
  FROM public.teachers
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  -- If not a teacher, check if there is an existing parent with this email
  IF v_teacher_exists IS NOT TRUE THEN
    SELECT school_id, TRUE INTO v_school_id, v_parent_exists
    FROM public.parents
    WHERE LOWER(email) = LOWER(NEW.email)
    LIMIT 1;
  END IF;

  -- Insert profile, setting school_id if found
  INSERT INTO public.profiles (user_id, full_name, email, school_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    v_school_id
  );

  -- Link user_roles and update teacher/parent records
  IF v_teacher_exists THEN
    -- Update teacher record
    UPDATE public.teachers
    SET user_id = NEW.id, status = 'active'
    WHERE LOWER(email) = LOWER(NEW.email);

    -- Insert/update user role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'teacher'
    ) THEN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (NEW.id, 'teacher', v_school_id);
    ELSE
      UPDATE public.user_roles
      SET school_id = v_school_id
      WHERE user_id = NEW.id AND role = 'teacher';
    END IF;
  ELSIF v_parent_exists THEN
    -- Update parent record
    UPDATE public.parents
    SET user_id = NEW.id, status = 'active'
    WHERE LOWER(email) = LOWER(NEW.email);

    -- Insert/update user role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'parent'
    ) THEN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (NEW.id, 'parent', v_school_id);
    ELSE
      UPDATE public.user_roles
      SET school_id = v_school_id
      WHERE user_id = NEW.id AND role = 'parent';
    END IF;
  END IF;

  IF NEW.raw_user_meta_data->>'role' = 'system_admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'system_admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'system_admin');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
