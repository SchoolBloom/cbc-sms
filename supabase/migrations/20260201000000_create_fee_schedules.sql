-- Create fee schedules table
CREATE TABLE public.fee_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  term INTEGER NOT NULL,
  academic_year TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (grade, term, academic_year)
);

ALTER TABLE public.fee_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view fee schedules" ON public.fee_schedules
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'bursar') OR
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'parent')
  );

CREATE POLICY "Admins and bursars can manage fee schedules" ON public.fee_schedules
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'bursar')
  );

CREATE TRIGGER update_fee_schedules_updated_at
  BEFORE UPDATE ON public.fee_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
