-- SchoolBloom Consolidated Database Initialization Migration
-- Scope: Learners, SBA Tasks, Assessments, Pathways

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. BASE SYSTEM TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  nemis_code TEXT,
  knec_code TEXT,
  levels_offered TEXT[],
  school_categories TEXT[] DEFAULT '{"primary_junior_secondary"}',
  admin_user_id UUID,
  county TEXT,
  subcounty TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  administrator_name TEXT,
  administrator_email TEXT,
  administrator_phone TEXT,
  status TEXT DEFAULT 'onboarding',
  active_status BOOLEAN DEFAULT false,
  logo_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'system_admin')),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_term INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT false,
  term1_start DATE,
  term1_end DATE,
  term2_start DATE,
  term2_end DATE,
  term3_start DATE,
  term3_end DATE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (school_id, label)
);

-- =============================================================================
-- 2. SCHOOL ENTITIES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL UNIQUE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  employee_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  stream TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL DEFAULT '2026',
  term INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  national_id_number TEXT,
  occupation TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  assessment_number TEXT,
  birth_certificate_number TEXT NOT NULL UNIQUE,
  upi_number TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  parent_id_secondary UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'completed', 'suspended')),
  pathway TEXT,
  senior_pathway TEXT,
  previous_school TEXT,
  medical_notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 3. SBA TASKS & SUBJECTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  pathway TEXT,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 4. KICD CURRICULUM HIERARCHY
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_area TEXT NOT NULL,
  grade TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sub_strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_id UUID REFERENCES public.strands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 5. CONTINUOUS ASSESSMENT LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.assessment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.learners(id) ON DELETE CASCADE,
  strand_id UUID REFERENCES public.strands(id),
  sub_strand_id UUID REFERENCES public.sub_strands(id),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  term INTEGER NOT NULL CHECK (term IN (1, 2, 3)),
  year TEXT NOT NULL,
  rubric_score TEXT NOT NULL CHECK (rubric_score IN ('Exceeds', 'Meets', 'Approaches', 'Below')),
  qualitative_notes TEXT,
  core_competency_notes TEXT,
  values_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 6. SBA CSV INGESTION LOGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sba_ingestion_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  ingested_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ingestion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.sba_ingestion_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 7. PATHWAYS PREFERENCES & ALLOCATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pathway_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.learners(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank IN (1, 2, 3)),
  pathway TEXT NOT NULL CHECK (pathway IN ('STEM', 'Social_Sciences', 'Arts_Sports')),
  academic_year TEXT NOT NULL,
  recorded_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pathway_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  learner_id UUID REFERENCES public.learners(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('STEM', 'Social_Sciences', 'Arts_Sports')),
  academic_year TEXT NOT NULL,
  kjsea_score NUMERIC CHECK (kjsea_score >= 0 AND kjsea_score <= 100),
  allocation_source TEXT NOT NULL CHECK (allocation_source IN ('KJSEA', 'manual', 'appeal')),
  finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- 8. DATABASE FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-fill school_id from learner reference
CREATE OR REPLACE FUNCTION public.set_school_id_from_learner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  SELECT school_id INTO NEW.school_id FROM public.learners WHERE id = NEW.learner_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_pathway_preferences_school_id
BEFORE INSERT ON public.pathway_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_learner();

CREATE TRIGGER set_pathway_allocations_school_id
BEFORE INSERT ON public.pathway_allocations
FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_learner();

-- Finalize Pathway Allocation and update learner profile
CREATE OR REPLACE FUNCTION public.finalize_pathway_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.finalized = true AND (TG_OP = 'INSERT' OR OLD.finalized IS DISTINCT FROM true) THEN
    NEW.finalized_at := now();
    UPDATE public.learners
    SET senior_pathway = NEW.pathway,
        pathway = CASE NEW.pathway
          WHEN 'STEM' THEN 'STEM'
          WHEN 'Social_Sciences' THEN 'Social Sciences'
          WHEN 'Arts_Sports' THEN 'Arts and Sports'
        END,
        updated_at = now()
    WHERE id = NEW.learner_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finalize_pathway_allocation_trigger
BEFORE INSERT OR UPDATE ON public.pathway_allocations
FOR EACH ROW EXECUTE FUNCTION public.finalize_pathway_allocation();

-- Helper functions to avoid policy recursion
CREATE OR REPLACE FUNCTION public.is_system_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'system_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_school_admin(user_uuid UUID, school_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin' AND (school_id = school_uuid OR school_uuid IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_school_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  -- 1. Try profiles
  SELECT school_id INTO resolved_school_id FROM public.profiles WHERE user_id = user_uuid;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 2. Try user_roles
  SELECT school_id INTO resolved_school_id FROM public.user_roles WHERE user_id = user_uuid AND school_id IS NOT NULL LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 3. Try teachers
  SELECT school_id INTO resolved_school_id FROM public.teachers WHERE user_id = user_uuid LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  -- 4. Try parents
  SELECT school_id INTO resolved_school_id FROM public.parents WHERE user_id = user_uuid LIMIT 1;
  IF resolved_school_id IS NOT NULL THEN
    RETURN resolved_school_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.provision_school_administrator(
  _school_id UUID,
  _admin_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  target_full_name TEXT;
BEGIN
  -- 1. Get user profile
  SELECT user_id, full_name INTO target_user_id, target_full_name
  FROM public.profiles
  WHERE LOWER(email) = LOWER(_admin_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Administrator account with email % not found. They must sign up first.', _admin_email;
  END IF;

  -- 2. Link profile to the school
  UPDATE public.profiles
  SET school_id = _school_id
  WHERE user_id = target_user_id;

  -- 3. Link school to the administrator
  UPDATE public.schools
  SET admin_user_id = target_user_id
  WHERE id = _school_id;

  -- 4. Delete existing admin role mapping to prevent duplicates
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';

  -- 5. Insert new admin role mapping
  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (target_user_id, 'admin', _school_id);

  RETURN 'Successfully provisioned ' || target_full_name || ' as administrator.';
END;
$$;

-- =============================================================================
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sba_ingestion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathway_allocations ENABLE ROW LEVEL SECURITY;

-- Basic helper policies
CREATE POLICY "Enable read for all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Enable update for user own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable read for user own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_system_admin(auth.uid()));

-- School Administrator policies
CREATE POLICY "School admins can manage schools" ON public.schools 
  USING (public.is_school_admin(auth.uid(), id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view their own school details" ON public.schools
  FOR SELECT
  USING (
    id = public.get_user_school_id(auth.uid()) OR
    public.is_system_admin(auth.uid())
  );

CREATE POLICY "School admins can manage profiles" ON public.profiles 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage roles" ON public.user_roles 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage academic years" ON public.academic_years 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage teachers" ON public.teachers 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage classes" ON public.classes 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage parents" ON public.parents 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage learners" ON public.learners 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage subject assignments" ON public.subject_assignments 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage assessment records" ON public.assessment_records 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage ingestion batches" ON public.sba_ingestion_batches 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage ingestion records" ON public.ingestion_records 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.sba_ingestion_batches b WHERE b.id = batch_id AND (public.is_school_admin(auth.uid(), b.school_id) OR public.is_system_admin(auth.uid()))));

CREATE POLICY "School admins can manage pathway preferences" ON public.pathway_preferences 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can manage pathway allocations" ON public.pathway_allocations 
  FOR ALL USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

-- School user view policies for segmentation
CREATE POLICY "Users can view school academic years" ON public.academic_years
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view school teachers" ON public.teachers
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view school classes" ON public.classes
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view school parents" ON public.parents
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Users can view school subject assignments" ON public.subject_assignments
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

-- Teacher policies
CREATE POLICY "Teachers can view classes in their school" ON public.classes 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid() AND school_id = school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Teachers can view learners in their school" ON public.learners 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid() AND school_id = school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Teachers can manage assessment records for school" ON public.assessment_records 
  FOR ALL USING (EXISTS (SELECT 1 FROM public.teachers WHERE user_id = auth.uid() AND school_id = school_id) OR public.is_system_admin(auth.uid()));

-- Parent policies
CREATE POLICY "Parents can view linked learners" ON public.learners 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.parents p WHERE p.user_id = auth.uid() AND (parent_id = p.id OR parent_id_secondary = p.id)) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Parents can view linked learner assessment records" ON public.assessment_records 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.parents p JOIN public.learners l ON (l.parent_id = p.id OR l.parent_id_secondary = p.id) WHERE p.user_id = auth.uid() AND learner_id = l.id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Parents can view linked learner pathway preferences" ON public.pathway_preferences 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.parents p JOIN public.learners l ON (l.parent_id = p.id OR l.parent_id_secondary = p.id) WHERE p.user_id = auth.uid() AND learner_id = l.id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "Parents can view linked learner pathway allocations" ON public.pathway_allocations 
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.parents p JOIN public.learners l ON (l.parent_id = p.id OR l.parent_id_secondary = p.id) WHERE p.user_id = auth.uid() AND learner_id = l.id) OR public.is_system_admin(auth.uid()));

-- Curriculum & Subjects read access
CREATE POLICY "Enable read subjects for all authenticated" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Enable read strands for all authenticated" ON public.strands FOR SELECT USING (true);
CREATE POLICY "Enable read substrands for all authenticated" ON public.sub_strands FOR SELECT USING (true);

-- System Admin policies
CREATE POLICY "System admins can manage all schools" ON public.schools FOR ALL USING (public.is_system_admin(auth.uid()));
CREATE POLICY "System admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_system_admin(auth.uid()));
CREATE POLICY "System admins can manage all roles" ON public.user_roles FOR ALL USING (public.is_system_admin(auth.uid()));

-- =============================================================================
-- 10. AUTH TRIGGER FOR NEW USERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  IF NEW.raw_user_meta_data->>'role' = 'system_admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'system_admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 11. USER ROLES SCHOOL ID AUTO-POPULATION & SYNCHRONIZATION TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_user_role_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  IF NEW.school_id IS NULL THEN
    -- Try resolving from teachers if role is teacher
    IF NEW.role = 'teacher' THEN
      SELECT school_id INTO resolved_school_id FROM public.teachers WHERE user_id = NEW.user_id LIMIT 1;
    -- Try resolving from parents if role is parent
    ELSIF NEW.role = 'parent' THEN
      SELECT school_id INTO resolved_school_id FROM public.parents WHERE user_id = NEW.user_id LIMIT 1;
    -- Try resolving from profiles
    ELSIF NEW.role = 'admin' THEN
      SELECT school_id INTO resolved_school_id FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    END IF;

    -- Fallback to get_user_school_id helper
    IF resolved_school_id IS NULL THEN
      resolved_school_id := public.get_user_school_id(NEW.user_id);
    END IF;

    NEW.school_id := resolved_school_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_role_school_id ON public.user_roles;
CREATE TRIGGER trg_set_user_role_school_id
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_user_role_school_id();

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
    END IF;
  ELSIF TG_TABLE_NAME = 'parents' THEN
    IF NEW.user_id IS NOT NULL AND NEW.school_id IS NOT NULL THEN
      UPDATE public.user_roles
      SET school_id = NEW.school_id
      WHERE user_id = NEW.user_id AND role = 'parent' AND (school_id IS NULL OR school_id != NEW.school_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_teacher_school_id ON public.teachers;
CREATE TRIGGER trg_sync_teacher_school_id
  AFTER INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_school_id();

DROP TRIGGER IF EXISTS trg_sync_parent_school_id ON public.parents;
CREATE TRIGGER trg_sync_parent_school_id
  AFTER INSERT OR UPDATE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role_school_id();

-- =============================================================================
-- 12. AUTOMATIC STUDENT PROMOTION TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_grade(current_grade TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  CASE current_grade
    WHEN 'PP1' THEN RETURN 'PP2';
    WHEN 'PP2' THEN RETURN 'Grade 1';
    WHEN 'Grade 1' THEN RETURN 'Grade 2';
    WHEN 'Grade 2' THEN RETURN 'Grade 3';
    WHEN 'Grade 3' THEN RETURN 'Grade 4';
    WHEN 'Grade 4' THEN RETURN 'Grade 5';
    WHEN 'Grade 5' THEN RETURN 'Grade 6';
    WHEN 'Grade 6' THEN RETURN 'Grade 7';
    WHEN 'Grade 7' THEN RETURN 'Grade 8';
    WHEN 'Grade 8' THEN RETURN 'Grade 9';
    WHEN 'Grade 9' THEN RETURN 'Grade 10';
    WHEN 'Grade 10' THEN RETURN 'Grade 11';
    WHEN 'Grade 11' THEN RETURN 'Grade 12';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_learners_on_year_rollover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_year_label TEXT;
  learner_rec RECORD;
  current_class_rec RECORD;
  next_grade_label TEXT;
  next_class_uuid UUID;
BEGIN
  -- Only trigger when a year is set to current (is_current becomes true)
  IF NEW.is_current = true AND (TG_OP = 'INSERT' OR OLD.is_current = false) THEN
    -- Find the previous current academic year label for this school (excluding the new one)
    SELECT label INTO old_year_label
    FROM public.academic_years
    WHERE school_id = NEW.school_id AND is_current = true AND id != NEW.id
    LIMIT 1;

    -- If no previous year label is found, we cannot run rollover
    IF old_year_label IS NOT NULL AND old_year_label != NEW.label THEN
      -- Loop over all active learners in the school
      FOR learner_rec IN
        SELECT l.id, l.class_id
        FROM public.learners l
        WHERE l.school_id = NEW.school_id AND l.status = 'active' AND l.class_id IS NOT NULL
      LOOP
        -- Get their current class details
        SELECT grade, stream, academic_year INTO current_class_rec
        FROM public.classes
        WHERE id = learner_rec.class_id;

        -- If their current class belongs to the old academic year
        IF current_class_rec.academic_year = old_year_label THEN
          next_grade_label := public.get_next_grade(current_class_rec.grade);

          IF next_grade_label IS NULL THEN
            -- Grade 12 or end of schooling: mark as completed and clear class_id
            UPDATE public.learners
            SET status = 'completed', class_id = NULL
            WHERE id = learner_rec.id;
          ELSE
            -- Try to find the next class for the new academic year
            SELECT id INTO next_class_uuid
            FROM public.classes
            WHERE school_id = NEW.school_id 
              AND grade = next_grade_label 
              AND stream = current_class_rec.stream 
              AND academic_year = NEW.label
            LIMIT 1;

            -- If it doesn't exist, create it automatically
            IF next_class_uuid IS NULL THEN
              INSERT INTO public.classes (school_id, grade, stream, academic_year)
              VALUES (NEW.school_id, next_grade_label, current_class_rec.stream, NEW.label)
              RETURNING id INTO next_class_uuid;
            END IF;

            -- Promote learner to next class
            UPDATE public.learners
            SET class_id = next_class_uuid
            WHERE id = learner_rec.id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- De-select other current academic years for the same school
    UPDATE public.academic_years
    SET is_current = false
    WHERE school_id = NEW.school_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_learners_on_year_rollover ON public.academic_years;
CREATE TRIGGER trg_promote_learners_on_year_rollover
  AFTER INSERT OR UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.promote_learners_on_year_rollover();

-- =============================================================================
-- 13. PRELOADED SUBJECTS DATABASE
-- =============================================================================

-- Insert subjects for primary & junior secondary
INSERT INTO public.subjects (name, category, code) VALUES
  ('English', 'primary_junior_secondary', 'PJS_ENG'),
  ('Kiswahili', 'primary_junior_secondary', 'PJS_KISW'),
  ('Mathematics', 'primary_junior_secondary', 'PJS_MATH'),
  ('Environmental Activities', 'primary_junior_secondary', 'PJS_ENV'),
  ('Hygiene and Nutrition', 'primary_junior_secondary', 'PJS_HYG'),
  ('Religious Education', 'primary_junior_secondary', 'PJS_REL'),
  ('Movement and Creative Activities', 'primary_junior_secondary', 'PJS_MOVE'),
  ('Science and Technology', 'primary_junior_secondary', 'PJS_SCI'),
  ('Social Studies', 'primary_junior_secondary', 'PJS_SST'),
  ('Home Science', 'primary_junior_secondary', 'PJS_HSC'),
  ('Agriculture', 'primary_junior_secondary', 'PJS_AGR'),
  ('Creative Arts', 'primary_junior_secondary', 'PJS_CART'),
  ('Physical and Health Education', 'primary_junior_secondary', 'PJS_PHE'),
  ('Integrated Science', 'primary_junior_secondary', 'PJS_ISCI'),
  ('Pre-Technical Studies', 'primary_junior_secondary', 'PJS_PTS'),
  ('Business Studies', 'primary_junior_secondary', 'PJS_BUS'),
  ('Life Skills Education', 'primary_junior_secondary', 'PJS_LSE'),
  ('Physical Education and Sports', 'primary_junior_secondary', 'PJS_PES')
ON CONFLICT (code) DO NOTHING;

-- Insert subjects for senior secondary (STEM pathway)
INSERT INTO public.subjects (name, category, pathway, code) VALUES
  ('English', 'senior_secondary', 'STEM', 'SS_STEM_ENG'),
  ('Kiswahili', 'senior_secondary', 'STEM', 'SS_STEM_KISW'),
  ('Community Service Learning', 'senior_secondary', 'STEM', 'SS_STEM_CSL'),
  ('Physical Education', 'senior_secondary', 'STEM', 'SS_STEM_PE'),
  ('Mathematics', 'senior_secondary', 'STEM', 'SS_STEM_MATH'),
  ('Biology', 'senior_secondary', 'STEM', 'SS_STEM_BIO'),
  ('Chemistry', 'senior_secondary', 'STEM', 'SS_STEM_CHEM'),
  ('Physics', 'senior_secondary', 'STEM', 'SS_STEM_PHYS'),
  ('General Science', 'senior_secondary', 'STEM', 'SS_STEM_GSCI'),
  ('Agriculture', 'senior_secondary', 'STEM', 'SS_STEM_AGRI'),
  ('Computer Studies', 'senior_secondary', 'STEM', 'SS_STEM_COMP'),
  ('Home Science', 'senior_secondary', 'STEM', 'SS_STEM_HSCI')
ON CONFLICT (code) DO NOTHING;

-- Insert subjects for senior secondary (Social Sciences pathway)
INSERT INTO public.subjects (name, category, pathway, code) VALUES
  ('English', 'senior_secondary', 'Social_Sciences', 'SS_SS_ENG'),
  ('Kiswahili', 'senior_secondary', 'Social_Sciences', 'SS_SS_KISW'),
  ('Community Service Learning', 'senior_secondary', 'Social_Sciences', 'SS_SS_CSL'),
  ('Physical Education', 'senior_secondary', 'Social_Sciences', 'SS_SS_PE'),
  ('History and Citizenship', 'senior_secondary', 'Social_Sciences', 'SS_SS_HIST'),
  ('Geography', 'senior_secondary', 'Social_Sciences', 'SS_SS_GEOG'),
  ('Christian Religious Education', 'senior_secondary', 'Social_Sciences', 'SS_SS_CRE'),
  ('Islamic Religious Education', 'senior_secondary', 'Social_Sciences', 'SS_SS_IRE'),
  ('Hindu Religious Education', 'senior_secondary', 'Social_Sciences', 'SS_SS_HRE'),
  ('Business Studies', 'senior_secondary', 'Social_Sciences', 'SS_SS_BUS')
ON CONFLICT (code) DO NOTHING;

-- Insert subjects for senior secondary (Arts & Sports pathway)
INSERT INTO public.subjects (name, category, pathway, code) VALUES
  ('English', 'senior_secondary', 'Arts_Sports', 'SS_AS_ENG'),
  ('Kiswahili', 'senior_secondary', 'Arts_Sports', 'SS_AS_KISW'),
  ('Community Service Learning', 'senior_secondary', 'Arts_Sports', 'SS_AS_CSL'),
  ('Physical Education', 'senior_secondary', 'Arts_Sports', 'SS_AS_PE'),
  ('Literature in English', 'senior_secondary', 'Arts_Sports', 'SS_AS_LIT'),
  ('Fasihi ya Kiswahili', 'senior_secondary', 'Arts_Sports', 'SS_AS_FAS'),
  ('Fine Arts', 'senior_secondary', 'Arts_Sports', 'SS_AS_FA'),
  ('Music and Dance', 'senior_secondary', 'Arts_Sports', 'SS_AS_MUD'),
  ('Theatre and Film', 'senior_secondary', 'Arts_Sports', 'SS_AS_TAF'),
  ('Sports and Recreation', 'senior_secondary', 'Arts_Sports', 'SS_AS_SAR')
ON CONFLICT (code) DO NOTHING;
