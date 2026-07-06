-- Fix RLS infinite recursion by using SECURITY DEFINER functions
-- to bypass RLS when checking parent_links.

CREATE OR REPLACE FUNCTION public.has_parent_link_to_school(p_parent_id UUID, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parent_links
    WHERE parent_id = p_parent_id AND school_id = p_school_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_linked_parent(p_parent_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parent_links pl
    JOIN public.user_roles ur ON ur.school_id = pl.school_id
    WHERE pl.parent_id = p_parent_id 
      AND ur.user_id = p_user_id 
      AND ur.role = 'admin'
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view school parents" ON public.parents;
CREATE POLICY "Users can view school parents" ON public.parents
  FOR SELECT USING (
    school_id = public.get_user_school_id(auth.uid()) 
    OR public.has_parent_link_to_school(id, public.get_user_school_id(auth.uid()))
    OR public.is_system_admin(auth.uid())
  );

DROP POLICY IF EXISTS "School admins can manage parents" ON public.parents;
CREATE POLICY "School admins can manage parents" ON public.parents 
  FOR ALL USING (
    public.is_school_admin(auth.uid(), school_id) 
    OR public.is_admin_of_linked_parent(id, auth.uid())
    OR public.is_system_admin(auth.uid())
  );
