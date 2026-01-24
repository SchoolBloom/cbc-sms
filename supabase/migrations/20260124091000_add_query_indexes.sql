-- Performance indexes for common filters/sorts
CREATE INDEX IF NOT EXISTS students_admission_number_idx ON public.students (admission_number);
CREATE INDEX IF NOT EXISTS students_class_id_idx ON public.students (class_id);
CREATE INDEX IF NOT EXISTS students_parent_id_idx ON public.students (parent_id);
CREATE INDEX IF NOT EXISTS students_status_idx ON public.students (status);

CREATE INDEX IF NOT EXISTS classes_teacher_id_idx ON public.classes (teacher_id);

CREATE INDEX IF NOT EXISTS attendance_class_date_idx ON public.attendance (class_id, date);
CREATE INDEX IF NOT EXISTS attendance_student_date_idx ON public.attendance (student_id, date);

CREATE INDEX IF NOT EXISTS assessments_class_created_at_idx ON public.assessments (class_id, created_at);
CREATE INDEX IF NOT EXISTS assessments_student_created_at_idx ON public.assessments (student_id, created_at);
CREATE INDEX IF NOT EXISTS assessments_learning_area_idx ON public.assessments (learning_area);

CREATE INDEX IF NOT EXISTS fees_student_id_idx ON public.fees (student_id);
CREATE INDEX IF NOT EXISTS fees_payment_date_idx ON public.fees (payment_date);
CREATE INDEX IF NOT EXISTS fees_status_idx ON public.fees (status);

CREATE INDEX IF NOT EXISTS subject_assignments_teacher_id_idx ON public.subject_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS subject_assignments_class_id_idx ON public.subject_assignments (class_id);
CREATE INDEX IF NOT EXISTS subject_assignments_subject_id_idx ON public.subject_assignments (subject_id);

CREATE INDEX IF NOT EXISTS notices_published_at_idx ON public.notices (published_at) WHERE published = true;
CREATE INDEX IF NOT EXISTS notices_published_idx ON public.notices (published);
CREATE INDEX IF NOT EXISTS notices_target_audience_gin_idx ON public.notices USING GIN (target_audience);
