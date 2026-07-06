-- Secure RPC function for cross-school learner transfer with SBA data migration.
-- Runs as SECURITY DEFINER to bypass RLS and search learners globally.

CREATE OR REPLACE FUNCTION public.admit_transfer_learner(
  p_target_school_id UUID,
  p_identifier_type TEXT,      -- 'UPI' or 'KNEC'
  p_identifier_value TEXT,
  p_new_admission_number TEXT,
  p_new_class_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_learner_id UUID;
  v_learner_name TEXT;
  v_origin_school_id UUID;
  v_origin_school_name TEXT;
  v_target_school_name TEXT;
  v_caller_id UUID;
BEGIN
  -- 1. Authenticate and authorize the caller
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (public.is_school_admin(v_caller_id, p_target_school_id) OR public.is_system_admin(v_caller_id)) THEN
    RAISE EXCEPTION 'Access denied. You must be an administrator of the receiving school.';
  END IF;

  -- 2. Validate identifier type
  IF p_identifier_type NOT IN ('UPI', 'KNEC') THEN
    RAISE EXCEPTION 'Invalid identifier type: %. Must be UPI or KNEC.', p_identifier_type;
  END IF;

  -- 3. Look up the learner globally (bypasses RLS via SECURITY DEFINER)
  IF p_identifier_type = 'UPI' THEN
    SELECT id, full_name, school_id
    INTO v_learner_id, v_learner_name, v_origin_school_id
    FROM public.learners
    WHERE upi_number = p_identifier_value
    LIMIT 1;
  ELSE -- 'KNEC'
    SELECT id, full_name, school_id
    INTO v_learner_id, v_learner_name, v_origin_school_id
    FROM public.learners
    WHERE assessment_number = p_identifier_value
    LIMIT 1;
  END IF;

  IF v_learner_id IS NULL THEN
    RAISE EXCEPTION 'No learner found with % identifier: %', p_identifier_type, p_identifier_value;
  END IF;

  -- 4. Prevent transferring to the same school
  IF v_origin_school_id = p_target_school_id THEN
    RAISE EXCEPTION 'Learner % is already enrolled at this school.', v_learner_name;
  END IF;

  -- 5. Resolve school names for record-keeping
  SELECT name INTO v_origin_school_name
  FROM public.schools WHERE id = v_origin_school_id;

  SELECT name INTO v_target_school_name
  FROM public.schools WHERE id = p_target_school_id;

  -- 6. Update the learner record (transfer to new school)
  UPDATE public.learners
  SET school_id = p_target_school_id,
      class_id = p_new_class_id,
      admission_number = p_new_admission_number,
      status = 'active',
      previous_school = COALESCE(v_origin_school_name, 'Unknown'),
      updated_at = now()
  WHERE id = v_learner_id;

  -- 7. Migrate SBA assessment records to the new school
  UPDATE public.assessment_records
  SET school_id = p_target_school_id
  WHERE learner_id = v_learner_id;

  -- 8. Migrate pathway preferences to the new school
  UPDATE public.pathway_preferences
  SET school_id = p_target_school_id
  WHERE learner_id = v_learner_id;

  -- 9. Migrate pathway allocations to the new school
  UPDATE public.pathway_allocations
  SET school_id = p_target_school_id
  WHERE learner_id = v_learner_id;

  -- 10. Update parent linkages to reference the new school
  UPDATE public.parent_links
  SET school_id = p_target_school_id
  WHERE learner_id = v_learner_id;

  -- 11. Return success payload
  RETURN json_build_object(
    'success', true,
    'learner_id', v_learner_id,
    'full_name', v_learner_name,
    'origin_school_name', COALESCE(v_origin_school_name, 'Unknown'),
    'target_school_name', COALESCE(v_target_school_name, 'Unknown')
  );
END;
$$;
