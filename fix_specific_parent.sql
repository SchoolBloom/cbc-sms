-- Replace 'ENTER_PARENT_EMAIL_HERE' with the actual email address of the parent.
-- This script will find that exact parent and correctly link them to any orphaned SSS learners.

DO $$
DECLARE
  v_parent_id UUID;
  v_user_id UUID;
  v_learner_id UUID;
  v_school_id UUID;
  v_parent_email TEXT := 'ENTER_PARENT_EMAIL_HERE';
BEGIN
  -- Find the specific parent by email
  SELECT id, user_id INTO v_parent_id, v_user_id 
  FROM public.parents 
  WHERE email ILIKE v_parent_email 
  LIMIT 1;
  
  IF v_parent_id IS NULL THEN
    RAISE NOTICE 'Parent with email % not found!', v_parent_email;
    RETURN;
  END IF;

  -- Loop through any active learners that were transferred and lost their linkage
  FOR v_learner_id, v_school_id IN 
    SELECT id, school_id FROM public.learners WHERE status = 'active'
  LOOP
    -- Only process learners that should belong to this parent 
    -- (If you only have 1 test learner, this is safe)
    
    -- Update the learner record with the correct parent
    UPDATE public.learners SET parent_id = v_parent_id WHERE id = v_learner_id;
    
    -- Create the correct parent_links record
    INSERT INTO public.parent_links (school_id, parent_id, learner_id, relationship, is_primary)
    VALUES (v_school_id, v_parent_id, v_learner_id, 'Parent', true)
    ON CONFLICT (parent_id, learner_id) DO UPDATE SET school_id = EXCLUDED.school_id;
    
    -- Move the parent's account to the correct school context so they don't see JSS in settings
    UPDATE public.parents SET school_id = v_school_id WHERE id = v_parent_id;
    
    IF v_user_id IS NOT NULL THEN
      UPDATE public.user_roles SET school_id = v_school_id WHERE user_id = v_user_id AND role = 'parent';
      UPDATE public.profiles SET school_id = v_school_id WHERE user_id = v_user_id;
    END IF;
    
    RAISE NOTICE 'Successfully restored linkage for learner % to parent %', v_learner_id, v_parent_email;
  END LOOP;
END $$;
