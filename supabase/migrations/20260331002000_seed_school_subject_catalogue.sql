CREATE OR REPLACE FUNCTION public.seed_default_subjects_for_school(target_school_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  school_categories TEXT[];
BEGIN
  IF target_school_id IS NULL THEN
    RETURN;
  END IF;

  SELECT s.school_categories
  INTO school_categories
  FROM public.schools s
  WHERE s.id = target_school_id
  LIMIT 1;

  INSERT INTO public.subjects (name, school_id)
  SELECT subject_name, target_school_id
  FROM (
    VALUES
      ('Language Activities', 'primary_junior_secondary'),
      ('Mathematical Activities', 'primary_junior_secondary'),
      ('Environmental Activities', 'primary_junior_secondary'),
      ('Psychomotor and Creative Activities', 'primary_junior_secondary'),
      ('Religious Education Activities', 'primary_junior_secondary'),
      ('Kiswahili', 'primary_junior_secondary'),
      ('English', 'primary_junior_secondary'),
      ('Mathematics', 'primary_junior_secondary'),
      ('Religious Education', 'primary_junior_secondary'),
      ('Creative Activities', 'primary_junior_secondary'),
      ('Science and Technology', 'primary_junior_secondary'),
      ('Social Studies', 'primary_junior_secondary'),
      ('Home Science', 'primary_junior_secondary'),
      ('Agriculture', 'primary_junior_secondary'),
      ('Creative Arts', 'primary_junior_secondary'),
      ('Physical and Health Education', 'primary_junior_secondary'),
      ('Integrated Science', 'primary_junior_secondary'),
      ('Pre-Technical Studies', 'primary_junior_secondary'),
      ('Business Studies', 'primary_junior_secondary'),
      ('Life Skills Education', 'primary_junior_secondary'),
      ('Physical Education and Sports', 'primary_junior_secondary'),
      ('English', 'senior_secondary'),
      ('Kiswahili', 'senior_secondary'),
      ('Community Service Learning', 'senior_secondary'),
      ('Physical Education', 'senior_secondary'),
      ('Mathematics', 'senior_secondary'),
      ('Biology', 'senior_secondary'),
      ('Chemistry', 'senior_secondary'),
      ('Physics', 'senior_secondary'),
      ('General Science', 'senior_secondary'),
      ('Agriculture', 'senior_secondary'),
      ('Computer Studies', 'senior_secondary'),
      ('Home Science', 'senior_secondary'),
      ('History and Citizenship', 'senior_secondary'),
      ('Geography', 'senior_secondary'),
      ('Christian Religious Education', 'senior_secondary'),
      ('Islamic Religious Education', 'senior_secondary'),
      ('Hindu Religious Education', 'senior_secondary'),
      ('Business Studies', 'senior_secondary'),
      ('Literature in English', 'senior_secondary'),
      ('Fasihi ya Kiswahili', 'senior_secondary'),
      ('Fine Arts', 'senior_secondary'),
      ('Music and Dance', 'senior_secondary'),
      ('Theatre and Film', 'senior_secondary'),
      ('Sports and Recreation', 'senior_secondary')
  ) AS default_subjects(subject_name, school_category)
  WHERE COALESCE(school_categories, ARRAY['primary_junior_secondary']::TEXT[]) @> ARRAY[default_subjects.school_category]::TEXT[]
    AND NOT EXISTS (
    SELECT 1
    FROM public.subjects s
    WHERE s.school_id = target_school_id
      AND s.name = default_subjects.subject_name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_default_subjects_for_new_school()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_subjects_for_school(NEW.id);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  school_record RECORD;
BEGIN
  FOR school_record IN
    SELECT id
    FROM public.schools
  LOOP
    PERFORM public.seed_default_subjects_for_school(school_record.id);
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS seed_default_subjects_on_school_create ON public.schools;
CREATE TRIGGER seed_default_subjects_on_school_create
AFTER INSERT OR UPDATE OF school_categories ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.seed_default_subjects_for_new_school();
