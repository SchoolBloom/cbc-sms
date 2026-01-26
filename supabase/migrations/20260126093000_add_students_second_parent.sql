-- Add optional second parent/guardian link for students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS parent_id_secondary UUID REFERENCES public.parents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS students_parent_id_secondary_idx ON public.students (parent_id_secondary);

-- Update parent access policies to include secondary parent
DROP POLICY IF EXISTS "Parents can view their children" ON public.students;
CREATE POLICY "Parents can view their children" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parents
      WHERE parents.user_id = auth.uid()
        AND (parents.id = students.parent_id OR parents.id = students.parent_id_secondary)
    )
  );

DROP POLICY IF EXISTS "Parents can view their children attendance" ON public.attendance;
CREATE POLICY "Parents can view their children attendance" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.parents p ON p.id = s.parent_id OR p.id = s.parent_id_secondary
      WHERE s.id = attendance.student_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can view their children fees" ON public.fees;
CREATE POLICY "Parents can view their children fees" ON public.fees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.parents p ON p.id = s.parent_id OR p.id = s.parent_id_secondary
      WHERE s.id = fees.student_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can view their children assessments" ON public.assessments;
CREATE POLICY "Parents can view their children assessments" ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.students s
      JOIN public.parents p ON p.id = s.parent_id OR p.id = s.parent_id_secondary
      WHERE s.id = assessments.student_id
        AND p.user_id = auth.uid()
    )
  );
