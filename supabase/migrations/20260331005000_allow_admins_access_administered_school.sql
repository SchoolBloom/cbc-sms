UPDATE public.profiles p
SET school_id = s.id
FROM public.schools s
WHERE s.admin_user_id = p.user_id
  AND p.school_id IS NULL;

DROP POLICY IF EXISTS "Users can view own school" ON public.schools;
CREATE POLICY "Users can view own school" ON public.schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.school_id = schools.id
    )
    OR admin_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "School admins can update own school" ON public.schools;
CREATE POLICY "School admins can update own school" ON public.schools
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND (
      admin_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.school_id = schools.id
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (
      admin_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.school_id = schools.id
      )
    )
  );
