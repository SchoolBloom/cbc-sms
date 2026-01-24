-- Ensure teachers/admins can insert/update assessments under RLS
DROP POLICY IF EXISTS "Teachers and admins can manage assessments" ON public.assessments;

CREATE POLICY "Teachers and admins can manage assessments" ON public.assessments
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'teacher')
  );
