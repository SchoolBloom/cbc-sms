-- Update sync_learner_parent_links to ALSO update the parent's school context
-- so the parent's portal automatically switches to the new school after a transfer.

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

    v_parent_id := NEW.parent_id;
  END IF;

  -- Insert/update secondary parent link
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
  -- if the learner was transferred and the parent has no other children in the old school.
  IF (TG_OP = 'UPDATE' AND OLD.school_id IS DISTINCT FROM NEW.school_id AND v_parent_id IS NOT NULL) THEN
    SELECT COUNT(*) INTO v_other_children_count 
    FROM public.parent_links 
    WHERE parent_id = v_parent_id AND school_id = OLD.school_id AND learner_id != NEW.id;

    IF v_other_children_count = 0 THEN
      -- Update parents record
      UPDATE public.parents SET school_id = NEW.school_id WHERE id = v_parent_id;
      
      -- Update user_roles and profiles
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
