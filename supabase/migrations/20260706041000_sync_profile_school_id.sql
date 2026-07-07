-- Update sync_user_role_school_id trigger to automatically update profiles.school_id
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

-- Allow school admins to view and manage profiles/roles that have no school assigned yet (school_id is null)
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

-- Adjust select policy for teachers table to allow teachers to select their own unlinked record by email/user_id
DROP POLICY IF EXISTS "Users can view school teachers" ON public.teachers;
CREATE POLICY "Users can view school teachers" ON public.teachers 
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR user_id = auth.uid()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR public.is_system_admin(auth.uid())
  );

-- Adjust select policy for parents table to allow parents to select their own unlinked record by email/user_id
DROP POLICY IF EXISTS "Users can view school parents" ON public.parents;
CREATE POLICY "Users can view school parents" ON public.parents 
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR user_id = auth.uid()
    OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
    OR public.is_system_admin(auth.uid())
  );

-- Allow users to link their own pre-registered teacher record by matching email
DROP POLICY IF EXISTS "Users can update their own teacher record" ON public.teachers;
CREATE POLICY "Users can update their own teacher record" ON public.teachers 
  FOR UPDATE USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  ) WITH CHECK (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );

-- Allow users to link their own pre-registered parent record by matching email
DROP POLICY IF EXISTS "Users can update their own parent record" ON public.parents;
CREATE POLICY "Users can update their own parent record" ON public.parents 
  FOR UPDATE USING (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  ) WITH CHECK (
    LOWER(email) = LOWER(auth.jwt() ->> 'email')
  );
