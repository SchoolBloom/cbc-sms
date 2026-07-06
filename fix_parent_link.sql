DO $$
DECLARE
  v_parent_id UUID;
  v_learner_id UUID;
  v_school_id UUID;
BEGIN
  -- Find a learner with no parent
  SELECT id, school_id INTO v_learner_id, v_school_id
  FROM public.learners
  WHERE parent_id IS NULL AND status = 'active'
  LIMIT 1;

  -- Find the first parent in the system
  SELECT id INTO v_parent_id
  FROM public.parents
  LIMIT 1;

  IF v_learner_id IS NOT NULL AND v_parent_id IS NOT NULL THEN
    -- Restore the linkage in learners
    UPDATE public.learners SET parent_id = v_parent_id WHERE id = v_learner_id;
    -- And parent_links
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (v_school_id, v_parent_id, v_learner_id, 'Parent', true)
    ON CONFLICT (parent_id, learner_id) DO UPDATE SET school_id = EXCLUDED.school_id;
    
    -- ALSO UPDATE THE PARENT'S SCHOOL ID TO SSS SO THEY SEE IT IN SETTINGS!
    UPDATE public.parents SET school_id = v_school_id WHERE id = v_parent_id;
    UPDATE public.user_roles SET school_id = v_school_id WHERE role = 'parent';
    UPDATE public.profiles p
    SET school_id = v_school_id
    FROM public.parents pr
    WHERE p.user_id = pr.user_id AND pr.id = v_parent_id;

    RAISE NOTICE 'Fixed learner % with parent %', v_learner_id, v_parent_id;
  END IF;
END $$;
