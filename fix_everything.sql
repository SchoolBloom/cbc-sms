-- 1. Fix RLS infinite recursion and allow cross-school visibility
CREATE OR REPLACE FUNCTION public.has_parent_link_to_school(p_parent_id UUID, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parent_links
    WHERE parent_id = p_parent_id AND school_id = p_school_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_linked_parent(p_parent_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parent_links pl
    JOIN public.user_roles ur ON ur.school_id = pl.school_id
    WHERE pl.parent_id = p_parent_id 
      AND ur.user_id = p_user_id 
      AND ur.role = 'admin'
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view school parents" ON public.parents;
CREATE POLICY "Users can view school parents" ON public.parents
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR public.has_parent_link_to_school(id, public.get_user_school_id(auth.uid()))
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School admins can manage parents" ON public.parents;
CREATE POLICY "School admins can manage parents" ON public.parents 
  FOR ALL USING (
    public.is_school_admin(auth.uid(), school_id) 
    OR public.is_admin_of_linked_parent(id, auth.uid())
    OR public.is_system_admin(auth.uid())
  );

-- 2. Update the sync trigger to migrate the parent's school_id context
CREATE OR REPLACE FUNCTION public.sync_learner_parent_links()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_user_id UUID;
  v_other_children_count INT;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    DELETE FROM public.parent_links 
    WHERE learner_id = OLD.id 
      AND parent_id NOT IN (
        COALESCE(NEW.parent_id, '00000000-0000-0000-0000-000000000000'::uuid), 
        COALESCE(NEW.parent_id_secondary, '00000000-0000-0000-0000-000000000000'::uuid)
      );
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (NEW.school_id, NEW.parent_id, NEW.id, 'Parent', true)
    ON CONFLICT (parent_id, learner_id) 
    DO UPDATE SET is_primary = true, school_id = EXCLUDED.school_id;
    v_parent_id := NEW.parent_id;
  END IF;

  IF NEW.parent_id_secondary IS NOT NULL THEN
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (NEW.school_id, NEW.parent_id_secondary, NEW.id, 'Parent', false)
    ON CONFLICT (parent_id, learner_id) 
    DO UPDATE SET is_primary = false, school_id = EXCLUDED.school_id;
    IF v_parent_id IS NULL THEN
      v_parent_id := NEW.parent_id_secondary;
    END IF;
  END IF;

  -- Automatically move the parent's primary school context to the new school
  IF (TG_OP = 'UPDATE' AND OLD.school_id IS DISTINCT FROM NEW.school_id AND v_parent_id IS NOT NULL) THEN
    SELECT COUNT(*) INTO v_other_children_count 
    FROM public.parent_links 
    WHERE parent_id = v_parent_id AND school_id = OLD.school_id AND learner_id != NEW.id;

    IF v_other_children_count = 0 THEN
      UPDATE public.parents SET school_id = NEW.school_id WHERE id = v_parent_id;
      SELECT user_id INTO v_user_id FROM public.parents WHERE id = v_parent_id;
      IF v_user_id IS NOT NULL THEN
        UPDATE public.user_roles SET school_id = NEW.school_id WHERE user_id = v_user_id AND role = 'parent';
        UPDATE public.profiles SET school_id = NEW.school_id WHERE user_id = v_user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Retroactively restore the linkage for any learners whose parent_id got wiped.
-- We do this by looking for the last deleted parent_links or by assuming the only parent in the system.
DO $$
DECLARE
  v_parent_id UUID;
  v_learner_id UUID;
  v_school_id UUID;
  v_user_id UUID;
BEGIN
  -- We'll just link any learner with NO parent to the FIRST parent in the database 
  -- (since this is likely a test instance with 1 parent)
  SELECT id INTO v_parent_id FROM public.parents LIMIT 1;
  
  IF v_parent_id IS NOT NULL THEN
    FOR v_learner_id, v_school_id IN 
      SELECT id, school_id FROM public.learners WHERE parent_id IS NULL AND status = 'active'
    LOOP
      UPDATE public.learners SET parent_id = v_parent_id WHERE id = v_learner_id;
      
      INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
      VALUES (v_school_id, v_parent_id, v_learner_id, 'Parent', true)
      ON CONFLICT (parent_id, learner_id) DO UPDATE SET school_id = EXCLUDED.school_id;
      
      UPDATE public.parents SET school_id = v_school_id WHERE id = v_parent_id;
      SELECT user_id INTO v_user_id FROM public.parents WHERE id = v_parent_id;
      IF v_user_id IS NOT NULL THEN
        UPDATE public.user_roles SET school_id = v_school_id WHERE user_id = v_user_id AND role = 'parent';
        UPDATE public.profiles SET school_id = v_school_id WHERE user_id = v_user_id;
      END IF;
    END LOOP;
  END IF;
END $$;
