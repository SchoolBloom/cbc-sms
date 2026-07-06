-- Grade 9 completes JSS; Senior Secondary (Grade 10+) is a separate level and often
-- a different school. Do not auto-promote Grade 9 learners on academic year rollover
-- unless they are staying for in-house SSS with a finalized pathway allocation here.

CREATE OR REPLACE FUNCTION public.promote_learners_on_year_rollover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_year_label TEXT;
  learner_rec RECORD;
  current_class_rec RECORD;
  next_grade_label TEXT;
  next_class_uuid UUID;
  school_has_sss BOOLEAN;
  alloc_finalized BOOLEAN;
  alloc_school_id UUID;
BEGIN
  -- Only trigger when a year is set to current (is_current becomes true)
  IF NEW.is_current = true AND (TG_OP = 'INSERT' OR OLD.is_current = false) THEN
    -- Find the previous current academic year label for this school (excluding the new one)
    SELECT label INTO old_year_label
    FROM public.academic_years
    WHERE school_id = NEW.school_id AND is_current = true AND id != NEW.id
    LIMIT 1;

    -- If no previous year label is found, we cannot run rollover
    IF old_year_label IS NOT NULL AND old_year_label != NEW.label THEN
      -- Loop over all active learners in the school
      FOR learner_rec IN
        SELECT l.id, l.class_id
        FROM public.learners l
        WHERE l.school_id = NEW.school_id AND l.status = 'active' AND l.class_id IS NOT NULL
      LOOP
        -- Get their current class details
        SELECT grade, stream, academic_year INTO current_class_rec
        FROM public.classes
        WHERE id = learner_rec.class_id;

        -- If their current class belongs to the old academic year
        IF current_class_rec.academic_year = old_year_label THEN
          IF current_class_rec.grade = 'Grade 9' THEN
            SELECT 'senior_secondary' = ANY(COALESCE(s.school_categories, '{}'))
            INTO school_has_sss
            FROM public.schools s
            WHERE s.id = NEW.school_id;

            SELECT pa.finalized, pa.allocated_school_id
            INTO alloc_finalized, alloc_school_id
            FROM public.pathway_allocations pa
            WHERE pa.learner_id = learner_rec.id
              AND pa.academic_year = old_year_label
            ORDER BY pa.finalized DESC, pa.created_at DESC
            LIMIT 1;

            -- In-house SSS only: school offers SSS, placement is finalized, and
            -- the allocation targets this school (or has no explicit destination yet).
            IF NOT (
              school_has_sss
              AND COALESCE(alloc_finalized, false)
              AND (alloc_school_id IS NULL OR alloc_school_id = NEW.school_id)
            ) THEN
              UPDATE public.learners
              SET class_id = NULL,
                  updated_at = now()
              WHERE id = learner_rec.id;
              CONTINUE;
            END IF;
          END IF;

          next_grade_label := public.get_next_grade(current_class_rec.grade);

          IF next_grade_label IS NULL THEN
            -- Grade 12 or end of schooling: mark as completed and clear class_id
            UPDATE public.learners
            SET status = 'completed', class_id = NULL
            WHERE id = learner_rec.id;
          ELSE
            -- Try to find the next class for the new academic year
            SELECT id INTO next_class_uuid
            FROM public.classes
            WHERE school_id = NEW.school_id
              AND grade = next_grade_label
              AND stream = current_class_rec.stream
              AND academic_year = NEW.label
            LIMIT 1;

            -- If it doesn't exist, create it automatically
            IF next_class_uuid IS NULL THEN
              INSERT INTO public.classes (school_id, grade, stream, academic_year)
              VALUES (NEW.school_id, next_grade_label, current_class_rec.stream, NEW.label)
              RETURNING id INTO next_class_uuid;
            END IF;

            -- Promote learner to next class
            UPDATE public.learners
            SET class_id = next_class_uuid
            WHERE id = learner_rec.id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- De-select other current academic years for the same school
    UPDATE public.academic_years
    SET is_current = false
    WHERE school_id = NEW.school_id AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
