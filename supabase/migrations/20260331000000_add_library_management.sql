ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'librarian';

CREATE OR REPLACE FUNCTION public.claim_profile_school_from_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
  requires_school BOOLEAN;
BEGIN
  IF NEW.school_id IS NULL THEN
    SELECT COALESCE(
      (SELECT t.school_id
       FROM public.teachers t
       WHERE t.user_id = NEW.user_id
       LIMIT 1),
      (SELECT p.school_id
       FROM public.parents p
       WHERE p.user_id = NEW.user_id
       LIMIT 1),
      (SELECT s.id
       FROM public.schools s
       WHERE s.admin_user_id = NEW.user_id
       LIMIT 1)
    )
    INTO resolved_school_id;

    IF resolved_school_id IS NULL
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'bursar')
        OR public.has_role(auth.uid(), 'teacher')
        OR public.has_role(auth.uid(), 'librarian')
      )
    THEN
      resolved_school_id := public.current_user_school_id();
    END IF;

    NEW.school_id := resolved_school_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role <> 'system_admin'
  )
  INTO requires_school;

  IF requires_school AND NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Accounts with a school role must be linked to a school';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_role_holder_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  IF NEW.role = 'system_admin' THEN
    RETURN NEW;
  END IF;

  SELECT p.school_id
  INTO resolved_school_id
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  IF resolved_school_id IS NULL AND NEW.role = 'teacher' THEN
    SELECT teacher_record.school_id
    INTO resolved_school_id
    FROM public.teachers teacher_record
    WHERE teacher_record.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL AND NEW.role = 'parent' THEN
    SELECT parent_record.school_id
    INTO resolved_school_id
    FROM public.parents parent_record
    WHERE parent_record.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL AND NEW.role = 'admin' THEN
    SELECT school_record.id
    INTO resolved_school_id
    FROM public.schools school_record
    WHERE school_record.admin_user_id = NEW.user_id
    LIMIT 1;
  END IF;

  IF resolved_school_id IS NULL THEN
    resolved_school_id := public.current_user_school_id();
  END IF;

  IF resolved_school_id IS NULL THEN
    RAISE EXCEPTION 'Cannot assign role % without linking the account to a school', NEW.role;
  END IF;

  UPDATE public.profiles
  SET school_id = resolved_school_id
  WHERE user_id = NEW.user_id
    AND school_id IS NULL;

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET school_id = school_record.id
FROM public.schools school_record
WHERE p.user_id = school_record.admin_user_id
  AND p.school_id IS NULL;

UPDATE public.profiles p
SET school_id = teacher_record.school_id
FROM public.teachers teacher_record
WHERE p.user_id = teacher_record.user_id
  AND p.school_id IS NULL
  AND teacher_record.school_id IS NOT NULL;

UPDATE public.profiles p
SET school_id = parent_record.school_id
FROM public.parents parent_record
WHERE p.user_id = parent_record.user_id
  AND p.school_id IS NULL
  AND parent_record.school_id IS NOT NULL;

DROP TRIGGER IF EXISTS set_profiles_school_id_from_actor ON public.profiles;
CREATE TRIGGER set_profiles_school_id_from_actor
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.claim_profile_school_from_actor();

DROP POLICY IF EXISTS "School staff can view students" ON public.students;
CREATE POLICY "School staff can view students" ON public.students
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'bursar')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );

CREATE TABLE IF NOT EXISTS public.library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  loan_period_days INTEGER NOT NULL DEFAULT 14 CHECK (loan_period_days > 0),
  daily_penalty_amount NUMERIC(10,2) NOT NULL DEFAULT 20 CHECK (daily_penalty_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id)
);

CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.library_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  issued_by_user_id UUID NOT NULL,
  issue_source TEXT NOT NULL CHECK (issue_source IN ('librarian', 'teacher')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'lost')),
  returned_at TIMESTAMPTZ,
  return_notes TEXT,
  lost_reported_at TIMESTAMPTZ,
  lost_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_books_school_id ON public.library_books (school_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_school_id ON public.library_loans (school_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_student_id ON public.library_loans (student_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_book_id ON public.library_loans (book_id);
CREATE INDEX IF NOT EXISTS idx_library_loans_due_date ON public.library_loans (due_date);

DROP TRIGGER IF EXISTS set_library_settings_school_id ON public.library_settings;
CREATE TRIGGER set_library_settings_school_id
BEFORE INSERT ON public.library_settings
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_library_books_school_id ON public.library_books;
CREATE TRIGGER set_library_books_school_id
BEFORE INSERT ON public.library_books
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS set_library_loans_school_id ON public.library_loans;
CREATE TRIGGER set_library_loans_school_id
BEFORE INSERT ON public.library_loans
FOR EACH ROW EXECUTE FUNCTION public.assign_school_id_from_current_user();

DROP TRIGGER IF EXISTS update_library_settings_updated_at ON public.library_settings;
CREATE TRIGGER update_library_settings_updated_at
BEFORE UPDATE ON public.library_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_library_books_updated_at ON public.library_books;
CREATE TRIGGER update_library_books_updated_at
BEFORE UPDATE ON public.library_books
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_library_loans_updated_at ON public.library_loans;
CREATE TRIGGER update_library_loans_updated_at
BEFORE UPDATE ON public.library_loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School staff can view library settings" ON public.library_settings
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );

CREATE POLICY "School admins and librarians can manage library settings" ON public.library_settings
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  )
  WITH CHECK (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );

CREATE POLICY "School users can view library books" ON public.library_books
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
      OR public.has_role(auth.uid(), 'parent')
    )
  );

CREATE POLICY "School admins and librarians can manage library books" ON public.library_books
  FOR ALL USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  )
  WITH CHECK (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );

CREATE POLICY "Staff and parents can view library loans" ON public.library_loans
  FOR SELECT USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
      OR EXISTS (
        SELECT 1
        FROM public.students s
        JOIN public.parents p
          ON p.id = s.parent_id
          OR p.id = s.parent_id_secondary
        WHERE s.id = library_loans.student_id
          AND p.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "School staff can issue library loans" ON public.library_loans
  FOR INSERT WITH CHECK (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );

CREATE POLICY "School staff can update library loans" ON public.library_loans
  FOR UPDATE USING (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
    )
  )
  WITH CHECK (
    public.belongs_to_current_school(school_id)
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'teacher')
      OR public.has_role(auth.uid(), 'librarian')
    )
  );
