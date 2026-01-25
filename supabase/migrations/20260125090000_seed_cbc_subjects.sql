WITH cbc_subjects(name) AS (
  VALUES
    ('Language Activities'),
    ('Mathematical Activities'),
    ('Environmental Activities'),
    ('Psychomotor and Creative Activities'),
    ('Religious Education Activities'),
    ('Kiswahili'),
    ('English'),
    ('Mathematics'),
    ('Religious Education'),
    ('Environmental Activities'),
    ('Creative Activities'),
    ('Science and Technology'),
    ('Social Studies'),
    ('Home Science'),
    ('Agriculture'),
    ('Creative Arts'),
    ('Physical and Health Education'),
    ('Integrated Science'),
    ('Pre-Technical Studies'),
    ('Business Studies'),
    ('Life Skills Education'),
    ('Physical Education and Sports')
)
INSERT INTO public.subjects (name)
SELECT cbc_subjects.name
FROM cbc_subjects
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subjects
  WHERE subjects.name = cbc_subjects.name
);
