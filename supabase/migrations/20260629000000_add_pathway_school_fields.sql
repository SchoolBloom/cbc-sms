-- Add preferred_school_name to pathway_preferences and update rank CHECK constraint to support 4 preferences
ALTER TABLE public.pathway_preferences ADD COLUMN IF NOT EXISTS preferred_school_name TEXT;
ALTER TABLE public.pathway_preferences DROP CONSTRAINT IF EXISTS pathway_preferences_rank_check;
ALTER TABLE public.pathway_preferences ADD CONSTRAINT pathway_preferences_rank_check CHECK (rank IN (1, 2, 3, 4));

-- Add allocated_school_name and allocated_school_code to pathway_allocations
ALTER TABLE public.pathway_allocations ADD COLUMN IF NOT EXISTS allocated_school_name TEXT;
ALTER TABLE public.pathway_allocations ADD COLUMN IF NOT EXISTS allocated_school_code TEXT;

-- Add category to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Public' CHECK (category IN ('Public', 'Private', 'Special_Needs'));

-- Revert/ensure standard SELECT policies on parents and teachers
DROP POLICY IF EXISTS "Users can view school parents" ON public.parents;
CREATE POLICY "Users can view school parents" ON public.parents
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view school teachers" ON public.teachers;
CREATE POLICY "Users can view school teachers" ON public.teachers
  FOR SELECT USING (school_id = public.get_user_school_id(auth.uid()) OR public.is_system_admin(auth.uid()));

-- Drop self-linking update policies to preserve data protection rules
DROP POLICY IF EXISTS "Users can update their own parent linkage" ON public.parents;
DROP POLICY IF EXISTS "Users can update their own teacher linkage" ON public.teachers;

-- Restore standard handle_new_user signup trigger (no automatic linking on user registration)
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

-- Triggers for parent and teacher linkage:
-- When an ADMIN creates or updates a parent/teacher record, it will automatically link to the user profile if one exists.
CREATE OR REPLACE FUNCTION public.handle_parent_linkage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_profile_id UUID;
BEGIN
  IF NEW.email IS NOT NULL THEN
    SELECT user_id INTO matching_profile_id FROM public.profiles WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
    IF matching_profile_id IS NOT NULL THEN
      NEW.user_id := matching_profile_id;
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = matching_profile_id AND role = 'parent'
      ) THEN
        INSERT INTO public.user_roles (user_id, role, school_id)
        VALUES (matching_profile_id, 'parent', NEW.school_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_linkage_trigger ON public.parents;
CREATE TRIGGER parent_linkage_trigger
  BEFORE INSERT OR UPDATE OF email, school_id ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_linkage();

CREATE OR REPLACE FUNCTION public.handle_teacher_linkage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matching_profile_id UUID;
BEGIN
  IF NEW.email IS NOT NULL THEN
    SELECT user_id INTO matching_profile_id FROM public.profiles WHERE LOWER(email) = LOWER(NEW.email) LIMIT 1;
    IF matching_profile_id IS NOT NULL THEN
      NEW.user_id := matching_profile_id;
      IF NOT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = matching_profile_id AND role = 'teacher'
      ) THEN
        INSERT INTO public.user_roles (user_id, role, school_id)
        VALUES (matching_profile_id, 'teacher', NEW.school_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_linkage_trigger ON public.teachers;
CREATE TRIGGER teacher_linkage_trigger
  BEFORE INSERT OR UPDATE OF email, school_id ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.handle_teacher_linkage();

-- Secure RPC function for Super Admin Dashboard stats
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_id UUID;
  is_admin BOOLEAN;
  result JSON;
BEGIN
  caller_id := auth.uid();
  
  -- Check if caller is system admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = caller_id AND role = 'system_admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied. System administrator role required.';
  END IF;
  
  SELECT json_build_object(
    'total_schools', (SELECT COUNT(*)::INT FROM public.schools),
    'total_learners', (SELECT COUNT(*)::INT FROM public.learners),
    'total_users', (SELECT COUNT(*)::INT FROM public.profiles),
    'schools_by_category', (
      SELECT COALESCE(json_agg(t), '[]'::json) FROM (
        SELECT COALESCE(category, 'Public') as category, COUNT(*)::INT as count
        FROM public.schools
        GROUP BY category
      ) t
    ),
    'accounts_by_role', (
      SELECT COALESCE(json_agg(r), '[]'::json) FROM (
        SELECT role, COUNT(*)::INT as count
        FROM public.user_roles
        GROUP BY role
      ) r
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create parent_links table if not exists
CREATE TABLE IF NOT EXISTS public.parent_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE NOT NULL,
  learner_id UUID REFERENCES public.learners(id) ON DELETE CASCADE NOT NULL,
  relationship TEXT DEFAULT 'Parent',
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(parent_id, learner_id)
);

-- Enable RLS on parent_links
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_links
DROP POLICY IF EXISTS "Parents can view their own parent_links" ON public.parent_links;
CREATE POLICY "Parents can view their own parent_links" ON public.parent_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parents p
      WHERE p.id = parent_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School admins can manage parent_links" ON public.parent_links;
CREATE POLICY "School admins can manage parent_links" ON public.parent_links
  FOR ALL USING (
    public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid())
  );

-- Replace select policies on learners, assessment_records, pathway_preferences, pathway_allocations
DROP POLICY IF EXISTS "Parents can view linked learners" ON public.learners;
CREATE POLICY "Parents can view linked learners" ON public.learners 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON pl.parent_id = p.id
      WHERE p.user_id = auth.uid() AND pl.learner_id = learners.id
    ) OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can view linked learner assessment records" ON public.assessment_records;
CREATE POLICY "Parents can view linked learner assessment records" ON public.assessment_records 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON pl.parent_id = p.id
      WHERE p.user_id = auth.uid() AND pl.learner_id = learner_id
    ) OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can view linked learner pathway preferences" ON public.pathway_preferences;
CREATE POLICY "Parents can view linked learner pathway preferences" ON public.pathway_preferences 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON pl.parent_id = p.id
      WHERE p.user_id = auth.uid() AND pl.learner_id = learner_id
    ) OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Parents can view linked learner pathway allocations" ON public.pathway_allocations;
CREATE POLICY "Parents can view linked learner pathway allocations" ON public.pathway_allocations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      JOIN public.parents p ON pl.parent_id = p.id
      WHERE p.user_id = auth.uid() AND pl.learner_id = learner_id
    ) OR public.is_system_admin(auth.uid())
  );

-- Trigger function to sync parent_links automatically from learners table parent_id columns
CREATE OR REPLACE FUNCTION public.sync_learner_parent_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle deletions of old links if parent_id changed or was cleared
  IF (TG_OP = 'UPDATE') THEN
    DELETE FROM public.parent_links 
    WHERE learner_id = OLD.id 
      AND parent_id NOT IN (
        COALESCE(NEW.parent_id, '00000000-0000-0000-0000-000000000000'::uuid), 
        COALESCE(NEW.parent_id_secondary, '00000000-0000-0000-0000-000000000000'::uuid)
      );
  END IF;

  -- Insert/update primary parent link
  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (NEW.school_id, NEW.parent_id, NEW.id, 'Parent', true)
    ON CONFLICT (parent_id, learner_id) 
    DO UPDATE SET is_primary = true, school_id = EXCLUDED.school_id;
  END IF;

  -- Insert/update secondary parent link
  IF NEW.parent_id_secondary IS NOT NULL THEN
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (NEW.school_id, NEW.parent_id_secondary, NEW.id, 'Parent', false)
    ON CONFLICT (parent_id, learner_id) 
    DO UPDATE SET is_primary = false, school_id = EXCLUDED.school_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_learner_parent_links_trigger ON public.learners;
CREATE TRIGGER sync_learner_parent_links_trigger
  AFTER INSERT OR UPDATE OF parent_id, parent_id_secondary, school_id ON public.learners
  FOR EACH ROW EXECUTE FUNCTION public.sync_learner_parent_links();

-- Backfill existing linkages from learners table columns
INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
SELECT school_id, parent_id, id, 'Parent', true
FROM public.learners
WHERE parent_id IS NOT NULL
ON CONFLICT (parent_id, learner_id) DO NOTHING;

INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
SELECT school_id, parent_id_secondary, id, 'Parent', false
FROM public.learners
WHERE parent_id_secondary IS NOT NULL
ON CONFLICT (parent_id, learner_id) DO NOTHING;


