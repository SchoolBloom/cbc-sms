DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'system_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  county TEXT,
  subcounty TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  administrator_name TEXT,
  administrator_email TEXT,
  administrator_phone TEXT,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'onboarding', 'suspended')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "System admins can view all profiles" ON public.profiles;
CREATE POLICY "System admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System admins can manage profile school assignment" ON public.profiles;
CREATE POLICY "System admins can manage profile school assignment" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System admins can view all roles" ON public.user_roles;
CREATE POLICY "System admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System admins can manage roles" ON public.user_roles;
CREATE POLICY "System admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System admins can view schools" ON public.schools;
CREATE POLICY "System admins can view schools" ON public.schools
  FOR SELECT USING (public.has_role(auth.uid(), 'system_admin'));

DROP POLICY IF EXISTS "System admins can manage schools" ON public.schools;
CREATE POLICY "System admins can manage schools" ON public.schools
  FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

DROP TRIGGER IF EXISTS update_schools_updated_at ON public.schools;
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
