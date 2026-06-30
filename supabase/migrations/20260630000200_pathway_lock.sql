-- Migration to add locking mechanism for pathway preferences

-- 1. Add is_locked column with default false
ALTER TABLE public.pathway_preferences ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false NOT NULL;

-- 2. Update RLS policies to restrict changes when locked
DROP POLICY IF EXISTS "School admins can manage pathway preferences" ON public.pathway_preferences;
DROP POLICY IF EXISTS "School admins can delete pathway preferences" ON public.pathway_preferences;
DROP POLICY IF EXISTS "School admins can update pathway preferences" ON public.pathway_preferences;
DROP POLICY IF EXISTS "School admins can insert pathway preferences" ON public.pathway_preferences;
DROP POLICY IF EXISTS "School admins can select pathway preferences" ON public.pathway_preferences;

CREATE POLICY "School admins can select pathway preferences" ON public.pathway_preferences
  FOR SELECT
  USING (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()));

CREATE POLICY "School admins can insert pathway preferences" ON public.pathway_preferences
  FOR INSERT
  WITH CHECK (
    public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid())
  );

CREATE POLICY "School admins can update pathway preferences" ON public.pathway_preferences
  FOR UPDATE
  USING (
    (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()))
    AND is_locked = false
  )
  WITH CHECK (
    public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid())
  );

CREATE POLICY "School admins can delete pathway preferences" ON public.pathway_preferences
  FOR DELETE
  USING (
    (public.is_school_admin(auth.uid(), school_id) OR public.is_system_admin(auth.uid()))
    AND is_locked = false
  );

-- 3. Create security definer RPC function to lock/unlock pathway preferences
CREATE OR REPLACE FUNCTION public.set_pathway_preferences_lock(
  target_learner_id UUID,
  target_academic_year TEXT,
  lock_state BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_school_id UUID;
BEGIN
  -- Get school_id from learners
  SELECT school_id INTO resolved_school_id FROM public.learners WHERE id = target_learner_id;

  -- Check if caller is school admin or system admin
  IF NOT (public.is_school_admin(auth.uid(), resolved_school_id) OR public.is_system_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.';
  END IF;

  UPDATE public.pathway_preferences
  SET is_locked = lock_state
  WHERE learner_id = target_learner_id AND academic_year = target_academic_year;
END;
$$;
