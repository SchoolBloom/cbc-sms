-- RLS policy fixes for Parents, parent_links, and learners

-- 1. Allow parents to view their own profile even if their school_id is NULL or not synced
DROP POLICY IF EXISTS "Parents can view their own profile" ON public.parents;
CREATE POLICY "Parents can view their own profile" ON public.parents
  FOR SELECT USING (user_id = auth.uid());

-- 2. Update SELECT policy for parent_links to check parent profiles linked to auth.uid() directly
DROP POLICY IF EXISTS "Parents can view their own parent_links" ON public.parent_links;
CREATE POLICY "Parents can view their own parent_links" ON public.parent_links
  FOR SELECT USING (
    parent_id IN (
      SELECT id FROM public.parents WHERE user_id = auth.uid()
    )
  );

-- 3. Update SELECT policy for learners so parents can query learners linked via parent_links directly
DROP POLICY IF EXISTS "Parents can view linked learners" ON public.learners;
CREATE POLICY "Parents can view linked learners" ON public.learners 
  FOR SELECT USING (
    id IN (
      SELECT learner_id FROM public.parent_links WHERE parent_id IN (
        SELECT id FROM public.parents WHERE user_id = auth.uid()
      )
    ) OR public.is_system_admin(auth.uid())
  );
