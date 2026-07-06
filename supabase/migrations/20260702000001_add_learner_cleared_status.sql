-- Allow admins to mark Grade 9 / Grade 12 learners as cleared (alumni)
-- when they advance to a new level or complete their studies.

ALTER TABLE public.learners
  DROP CONSTRAINT IF EXISTS learners_status_check;

ALTER TABLE public.learners
  ADD CONSTRAINT learners_status_check
  CHECK (status IN ('active', 'transferred', 'completed', 'suspended', 'cleared'));
