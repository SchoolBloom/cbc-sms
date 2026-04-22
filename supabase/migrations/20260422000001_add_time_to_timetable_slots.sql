-- Add time allocation to timetable slots
ALTER TABLE public.timetable_slots
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Ensure valid time ranges when both are provided
ALTER TABLE public.timetable_slots
  DROP CONSTRAINT IF EXISTS timetable_slots_valid_time_range;

ALTER TABLE public.timetable_slots
  ADD CONSTRAINT timetable_slots_valid_time_range
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  );

CREATE INDEX IF NOT EXISTS idx_timetable_slots_day_period ON public.timetable_slots(day_of_week, period_number);
