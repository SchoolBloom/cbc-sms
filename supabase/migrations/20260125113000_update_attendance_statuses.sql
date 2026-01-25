UPDATE public.attendance
SET status = 'present'
WHERE status IN ('late', 'excused');

ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent'));
