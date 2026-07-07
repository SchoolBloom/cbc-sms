-- Standalone script to update trigger functions, RLS policies, and retroactively link existing teachers/parents
-- Run this in the Supabase SQL Editor.

-- 1. Update handle_new_user trigger function
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

-- 2. Update sync_user_role_school_id trigger function
CREATE OR REPLACE FUNCTION public.sync_user_role_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'teachers' THEN
    IF NEW.user_id IS NOT NULL AND NEW.school_id IS NOT NULL THEN
      UPDATE public.user_roles
      SET school_id = NEW.school_id
      WHERE user_id = NEW.user_id AND role = 'teacher' AND (school_id IS NULL OR school_id != NEW.school_id);
      
      UPDATE public.profiles
      SET school_id = NEW.school_id
      WHERE user_id = NEW.user_id AND (school_id IS NULL OR school_id != NEW.school_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'parents' THEN
    IF NEW.user_id IS NOT NULL AND NEW.school_id IS NOT NULL THEN
      UPDATE public.user_roles
      SET school_id = NEW.school_id
      WHERE user_id = NEW.user_id AND role = 'parent' AND (school_id IS NULL OR school_id != NEW.school_id);
      
      UPDATE public.profiles
      SET school_id = NEW.school_id
      WHERE user_id = NEW.user_id AND (school_id IS NULL OR school_id != NEW.school_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Adjust RLS policies to allow school admins to link unallocated profiles and roles
DROP POLICY IF EXISTS "School admins can manage profiles" ON public.profiles;
CREATE POLICY "School admins can manage profiles" ON public.profiles 
  FOR ALL USING (
    public.is_school_admin(auth.uid(), school_id) 
    OR school_id IS NULL 
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School admins can manage roles" ON public.user_roles;
CREATE POLICY "School admins can manage roles" ON public.user_roles 
  FOR ALL USING (
    public.is_school_admin(auth.uid(), school_id) 
    OR school_id IS NULL 
    OR public.is_system_admin(auth.uid())
  );

-- 4. Adjust select policy for teachers table to allow teachers to select their own unlinked record by email/user_id
DROP POLICY IF EXISTS "Users can view school teachers" ON public.teachers;
CREATE POLICY "Users can view school teachers" ON public.teachers 
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR user_id = auth.uid()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR public.is_system_admin(auth.uid())
  );

-- 5. Adjust select policy for parents table to allow parents to select their own unlinked record by email/user_id
DROP POLICY IF EXISTS "Users can view school parents" ON public.parents;
CREATE POLICY "Users can view school parents" ON public.parents 
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR user_id = auth.uid()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR public.is_system_admin(auth.uid())
  );

-- 6. Allow users to link their own pre-registered teacher record by matching email
DROP POLICY IF EXISTS "Users can update their own teacher record" ON public.teachers;
CREATE POLICY "Users can update their own teacher record" ON public.teachers 
  FOR UPDATE USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  ) WITH CHECK (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );

-- 7. Allow users to link their own pre-registered parent record by matching email
DROP POLICY IF EXISTS "Users can update their own parent record" ON public.parents;
CREATE POLICY "Users can update their own parent record" ON public.parents 
  FOR UPDATE USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  ) WITH CHECK (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );

-- 8. Retroactively link any registered users that are already in auth.users
-- but do not have their user_id linked in teachers or parents tables yet.
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  -- Retroactively link teachers
  FOR v_rec IN 
    SELECT p.user_id, t.id as teacher_id, t.school_id
    FROM public.profiles p
    JOIN public.teachers t ON LOWER(t.email) = LOWER(p.email)
    WHERE t.user_id IS NULL OR t.user_id != p.user_id
  LOOP
    UPDATE public.teachers
    SET user_id = v_rec.user_id, status = 'active'
    WHERE id = v_rec.teacher_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = v_rec.user_id AND role = 'teacher'
    ) THEN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (v_rec.user_id, 'teacher', v_rec.school_id);
    ELSE
      UPDATE public.user_roles
      SET school_id = v_rec.school_id
      WHERE user_id = v_rec.user_id AND role = 'teacher';
    END IF;

    UPDATE public.profiles
    SET school_id = v_rec.school_id
    WHERE user_id = v_rec.user_id AND (school_id IS NULL OR school_id != v_rec.school_id);
  END LOOP;

  -- Retroactively link parents
  FOR v_rec IN 
    SELECT p.user_id, pr.id as parent_id, pr.school_id
    FROM public.profiles p
    JOIN public.parents pr ON LOWER(pr.email) = LOWER(p.email)
    WHERE pr.user_id IS NULL OR pr.user_id != p.user_id
  LOOP
    UPDATE public.parents
    SET user_id = v_rec.user_id, status = 'active'
    WHERE id = v_rec.parent_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = v_rec.user_id AND role = 'parent'
    ) THEN
      INSERT INTO public.user_roles (user_id, role, school_id)
      VALUES (v_rec.user_id, 'parent', v_rec.school_id);
    ELSE
      UPDATE public.user_roles
      SET school_id = v_rec.school_id
      WHERE user_id = v_rec.user_id AND role = 'parent';
    END IF;

    UPDATE public.profiles
    SET school_id = v_rec.school_id
    WHERE user_id = v_rec.user_id AND (school_id IS NULL OR school_id != v_rec.school_id);
  END LOOP;
END $$;
