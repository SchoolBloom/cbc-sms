-- Create academic years table
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_term INTEGER NOT NULL CHECK (current_term IN (1, 2, 3)),
  term1_start DATE,
  term1_end DATE,
  term2_start DATE,
  term2_end DATE,
  term3_start DATE,
  term3_end DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (label)
);

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view academic years" ON public.academic_years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage academic years" ON public.academic_years
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_academic_years_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
