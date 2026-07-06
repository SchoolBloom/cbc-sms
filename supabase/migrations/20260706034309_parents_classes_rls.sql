-- Fix the RLS policy for classes so parents can view classes for all schools where they have linked children.

DROP POLICY IF EXISTS "Parents can view linked children's classes" ON public.classes;
CREATE POLICY "Parents can view linked children's classes" ON public.classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON p.id = pl.parent_id
      WHERE p.user_id = auth.uid() AND pl.school_id = classes.school_id
    )
  );

-- Also, to ensure they can view schools
DROP POLICY IF EXISTS "Parents can view linked children's schools" ON public.schools;
CREATE POLICY "Parents can view linked children's schools" ON public.schools
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON p.id = pl.parent_id
      WHERE p.user_id = auth.uid() AND pl.school_id = schools.id
    )
  );
