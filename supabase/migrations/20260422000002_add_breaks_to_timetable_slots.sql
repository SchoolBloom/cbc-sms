-- Support break slots inside timetables
ALTER TABLE public.timetable_slots
  ADD COLUMN IF NOT EXISTS slot_type TEXT NOT NULL DEFAULT 'lesson',
  ADD COLUMN IF NOT EXISTS label TEXT;

-- Constrain to allowed slot types
ALTER TABLE public.timetable_slots
  DROP CONSTRAINT IF EXISTS timetable_slots_slot_type_allowed;

ALTER TABLE public.timetable_slots
  ADD CONSTRAINT timetable_slots_slot_type_allowed
  CHECK (slot_type IN ('lesson', 'break'));

-- For break slots, teacher must be null
ALTER TABLE public.timetable_slots
  DROP CONSTRAINT IF EXISTS timetable_slots_break_teacher_null;

ALTER TABLE public.timetable_slots
  ADD CONSTRAINT timetable_slots_break_teacher_null
  CHECK (slot_type <> 'break' OR teacher_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_slot_type ON public.timetable_slots(slot_type);
