-- 1. Update existing orphan NULL school_id records to target 'Sanaet Education Centre' (the test school)
UPDATE public.learners
SET school_id = 'eb83fe34-901d-425b-8407-86b86d178822'
WHERE school_id IS NULL;

UPDATE public.classes
SET school_id = 'eb83fe34-901d-425b-8407-86b86d178822'
WHERE school_id IS NULL;

UPDATE public.teachers
SET school_id = 'eb83fe34-901d-425b-8407-86b86d178822'
WHERE school_id IS NULL;

-- 2. Create helper trigger function to auto-assign school_id from creator's scope if not explicitly provided
CREATE OR REPLACE FUNCTION public.set_school_id_from_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_school_id UUID;
BEGIN
  IF NEW.school_id IS NULL THEN
    creator_school_id := public.get_user_school_id(auth.uid());
    IF creator_school_id IS NOT NULL THEN
      NEW.school_id := creator_school_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach triggers to per-school entities
DROP TRIGGER IF EXISTS classes_school_id_trigger ON public.classes;
CREATE TRIGGER classes_school_id_trigger
  BEFORE INSERT ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();

DROP TRIGGER IF EXISTS learners_school_id_trigger ON public.learners;
CREATE TRIGGER learners_school_id_trigger
  BEFORE INSERT ON public.learners
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();

DROP TRIGGER IF EXISTS teachers_school_id_trigger ON public.teachers;
CREATE TRIGGER teachers_school_id_trigger
  BEFORE INSERT ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();

DROP TRIGGER IF EXISTS parents_school_id_trigger ON public.parents;
CREATE TRIGGER parents_school_id_trigger
  BEFORE INSERT ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();

DROP TRIGGER IF EXISTS subject_assignments_school_id_trigger ON public.subject_assignments;
CREATE TRIGGER subject_assignments_school_id_trigger
  BEFORE INSERT ON public.subject_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();

DROP TRIGGER IF EXISTS assessment_records_school_id_trigger ON public.assessment_records;
CREATE TRIGGER assessment_records_school_id_trigger
  BEFORE INSERT ON public.assessment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_creator();
