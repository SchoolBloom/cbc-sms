CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.belongs_to_current_school(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _school_id IS NOT NULL AND _school_id = public.current_user_school_id()
$$;

CREATE OR REPLACE FUNCTION public.assign_school_id_from_current_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.current_user_school_id();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_profile_school_from_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
      OR public.has_role(auth.uid(), 'teacher')
    )
  THEN
    NEW.school_id := public.current_user_school_id();
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.parents ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.fee_schedules ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.academic_years ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;
ALTER TABLE public.subject_assignments ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

DO $$
DECLARE
  default_school_id UUID;
BEGIN
  SELECT id INTO default_school_id
  FROM public.schools
  ORDER BY created_at
  LIMIT 1;

  IF default_school_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.classes SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.parents SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.students SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.attendance SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.fees SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.assessments SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.notices SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.events SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.teachers SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.fee_schedules SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.academic_years SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.subjects SET school_id = default_school_id WHERE school_id IS NULL;
  UPDATE public.subject_assignments SET school_id = default_school_id WHERE school_id IS NULL;
END
$$;

DROP TRIGGER IF EXISTS set_profiles_school_id_from_actor ON public.profiles;
CREATE TRIGGER set_profiles_school_id_from_actor
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_profile_school_from_actor();

DROP TRIGGER IF EXISTS set_classes_school_id ON public.classes;
CREATE TRIGGER set_classes_school_id
BEFORE INSERT ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_parents_school_id ON public.parents;
CREATE TRIGGER set_parents_school_id
BEFORE INSERT ON public.parents
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_students_school_id ON public.students;
CREATE TRIGGER set_students_school_id
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_attendance_school_id ON public.attendance;
CREATE TRIGGER set_attendance_school_id
BEFORE INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_fees_school_id ON public.fees;
CREATE TRIGGER set_fees_school_id
BEFORE INSERT ON public.fees
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_assessments_school_id ON public.assessments;
CREATE TRIGGER set_assessments_school_id
BEFORE INSERT ON public.assessments
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_notices_school_id ON public.notices;
CREATE TRIGGER set_notices_school_id
BEFORE INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_events_school_id ON public.events;
CREATE TRIGGER set_events_school_id
BEFORE INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_teachers_school_id ON public.teachers;
CREATE TRIGGER set_teachers_school_id
BEFORE INSERT ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_fee_schedules_school_id ON public.fee_schedules;
CREATE TRIGGER set_fee_schedules_school_id
BEFORE INSERT ON public.fee_schedules
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_academic_years_school_id ON public.academic_years;
CREATE TRIGGER set_academic_years_school_id
BEFORE INSERT ON public.academic_years
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_subjects_school_id ON public.subjects;
CREATE TRIGGER set_subjects_school_id
BEFORE INSERT ON public.subjects
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_subject_assignments_school_id ON public.subject_assignments;
CREATE TRIGGER set_subject_assignments_school_id
BEFORE INSERT ON public.subject_assignments
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_grade_stream_academic_year_key;
ALTER TABLE public.classes ADD CONSTRAINT classes_grade_stream_academic_year_school_key UNIQUE (school_id, grade, stream, academic_year);

ALTER TABLE public.fee_schedules DROP CONSTRAINT IF EXISTS fee_schedules_grade_term_academic_year_key;
ALTER TABLE public.fee_schedules ADD CONSTRAINT fee_schedules_grade_term_academic_year_school_key UNIQUE (school_id, grade, term, academic_year);

ALTER TABLE public.academic_years DROP CONSTRAINT IF EXISTS academic_years_label_key;
ALTER TABLE public.academic_years ADD CONSTRAINT academic_years_school_label_key UNIQUE (school_id, label);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update school profiles" ON public.profiles;
CREATE POLICY "Admins can view school profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    AND (school_id IS NULL OR public.belongs_to_current_school(school_id))
  );

CREATE POLICY "Admins can update school profiles" ON public.profiles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    AND (school_id IS NULL OR public.belongs_to_current_school(school_id))
  );

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage school roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND (p.school_id IS NULL OR public.belongs_to_current_school(p.school_id))
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = user_roles.user_id
        AND (p.school_id IS NULL OR public.belongs_to_current_school(p.school_id))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "School users can view classes" ON public.classes
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage classes" ON public.classes
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Admins and bursars can view all parents" ON public.parents;
DROP POLICY IF EXISTS "Parents can view own record" ON public.parents;
DROP POLICY IF EXISTS "Admins can manage parents" ON public.parents;
CREATE POLICY "School staff can view parents" ON public.parents
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
CREATE POLICY "Parents can view own school record" ON public.parents
  FOR SELECT USING (user_id = auth.uid() AND public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage parents" ON public.parents
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Staff can view all students" ON public.students;
DROP POLICY IF EXISTS "Parents can view their children" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
CREATE POLICY "School staff can view students" ON public.students
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'bursar')
    )
  );
CREATE POLICY "Parents can view their school children" ON public.students
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND EXISTS (
      SELECT 1 FROM public.parents
      WHERE (parents.id = students.parent_id OR parents.id = students.parent_id_secondary)
        AND parents.user_id = auth.uid()
    )
  );
CREATE POLICY "School admins can manage students" ON public.students
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Staff can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Parents can view their children attendance" ON public.attendance;
CREATE POLICY "School staff can view attendance" ON public.attendance
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
CREATE POLICY "School teachers and admins can manage attendance" ON public.attendance
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
CREATE POLICY "Parents can view school attendance" ON public.attendance
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.parents p ON s.parent_id = p.id OR s.parent_id_secondary = p.id
      WHERE s.id = attendance.student_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and bursars can view all fees" ON public.fees;
DROP POLICY IF EXISTS "Admins and bursars can manage fees" ON public.fees;
DROP POLICY IF EXISTS "Parents can view their children fees" ON public.fees;
CREATE POLICY "School admins and bursars can view fees" ON public.fees
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
    )
  );
CREATE POLICY "School admins and bursars can manage fees" ON public.fees
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
    )
  );
CREATE POLICY "Parents can view school fees" ON public.fees
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.parents p ON s.parent_id = p.id OR s.parent_id_secondary = p.id
      WHERE s.id = fees.student_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view assessments" ON public.assessments;
DROP POLICY IF EXISTS "Teachers and admins can manage assessments" ON public.assessments;
DROP POLICY IF EXISTS "Parents can view their children assessments" ON public.assessments;
CREATE POLICY "School staff can view assessments" ON public.assessments
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
CREATE POLICY "School teachers and admins can manage assessments" ON public.assessments
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
    )
  );
CREATE POLICY "Parents can view school assessments" ON public.assessments
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.parents p ON s.parent_id = p.id OR s.parent_id_secondary = p.id
      WHERE s.id = assessments.student_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view published notices" ON public.notices;
DROP POLICY IF EXISTS "Admins can manage notices" ON public.notices;
CREATE POLICY "School users can view published notices" ON public.notices
  FOR SELECT TO authenticated USING (published = true AND public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage notices" ON public.notices
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Authenticated users can view events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "School users can view events" ON public.events
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "School users can view teachers" ON public.teachers
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage teachers" ON public.teachers
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Staff can view fee schedules" ON public.fee_schedules;
DROP POLICY IF EXISTS "Admins and bursars can manage fee schedules" ON public.fee_schedules;
CREATE POLICY "School users can view fee schedules" ON public.fee_schedules
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'parent')
    )
  );
CREATE POLICY "School admins and bursars can manage fee schedules" ON public.fee_schedules
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'bursar')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view academic years" ON public.academic_years;
DROP POLICY IF EXISTS "Admins can manage academic years" ON public.academic_years;
CREATE POLICY "School users can view academic years" ON public.academic_years
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage academic years" ON public.academic_years
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "School users can view subjects" ON public.subjects
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage subjects" ON public.subjects
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));

DROP POLICY IF EXISTS "Authenticated users can view subject assignments" ON public.subject_assignments;
DROP POLICY IF EXISTS "Admins can manage subject assignments" ON public.subject_assignments;
CREATE POLICY "School users can view subject assignments" ON public.subject_assignments
  FOR SELECT TO authenticated USING (public.belongs_to_current_school(school_id));
CREATE POLICY "School admins can manage subject assignments" ON public.subject_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'admin') AND public.belongs_to_current_school(school_id));
