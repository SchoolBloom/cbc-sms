DROP POLICY IF EXISTS "School admins can update own school" ON public.schools;
CREATE POLICY "School admins can update own school" ON public.schools
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.school_id = schools.id
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.school_id = schools.id
    )
  );
