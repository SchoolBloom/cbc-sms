-- Fix variable scoping bug in teacher RLS policies where school_id = school_id was resolving to true
-- Also refine is_school_admin helper function to prevent spill-over of unassigned/NULL school records

CREATE OR REPLACE FUNCTION public.is_school_admin(user_uuid UUID, school_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin role and their school matches school_uuid (no global fallback for school_uuid is null)
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin' 
      AND (school_id = school_uuid OR public.get_user_school_id(user_uuid) = school_uuid)
  );
END;
$$;

DROP POLICY IF EXISTS "Teachers can view classes in their school" ON public.classes;
CREATE POLICY "Teachers can view classes in their school" ON public.classes 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE user_id = auth.uid() AND public.teachers.school_id = public.classes.school_id
    ) 
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can view learners in their school" ON public.learners;
CREATE POLICY "Teachers can view learners in their school" ON public.learners 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE user_id = auth.uid() AND public.teachers.school_id = public.learners.school_id
    ) 
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can manage assessment records for school" ON public.assessment_records;
CREATE POLICY "Teachers can manage assessment records for school" ON public.assessment_records 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE user_id = auth.uid() AND public.teachers.school_id = public.assessment_records.school_id
    ) 
    OR public.is_system_admin(auth.uid())
  );
