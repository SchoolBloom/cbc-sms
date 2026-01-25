CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.teachers (user_id, full_name, email, phone)
SELECT p.user_id, p.full_name, p.email, p.phone
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'teacher'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.teachers t
  WHERE t.user_id = p.user_id
);
