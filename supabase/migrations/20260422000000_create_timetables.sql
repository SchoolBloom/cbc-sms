-- Create timetable tables
-- Main timetable table for storing class timetables
CREATE TABLE public.timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  stream TEXT,
  academic_year TEXT NOT NULL,
  term INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (grade, stream, academic_year, term)
);

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- Timetable slots table for individual time slots
CREATE TABLE public.timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID NOT NULL REFERENCES public.timetables(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  period_number INTEGER NOT NULL CHECK (period_number >= 1 AND period_number <= 10),
  subject TEXT NOT NULL,
  teacher_id UUID REFERENCES public.teachers(id),
  room TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (timetable_id, day_of_week, period_number)
);

ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timetables
CREATE POLICY "Staff can view timetables" ON public.timetables
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'parent')
  );

CREATE POLICY "Admins can manage timetables" ON public.timetables
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for timetable slots
CREATE POLICY "Staff can view timetable slots" ON public.timetable_slots
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'parent')
  );

CREATE POLICY "Admins can manage timetable slots" ON public.timetable_slots
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- Triggers for updated_at
CREATE TRIGGER update_timetables_updated_at
  BEFORE UPDATE ON public.timetables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_timetable_slots_timetable_id ON public.timetable_slots(timetable_id);
CREATE INDEX idx_timetable_slots_teacher_id ON public.timetable_slots(teacher_id);
CREATE INDEX idx_timetables_grade ON public.timetables(grade);