CREATE POLICY "Users can view own school" ON public.schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.school_id = schools.id
    )
  );
