-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 009_enrollment.sql
-- Purpose: Create Enrollment table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.enrollments (
    enrollment_id SERIAL PRIMARY KEY,

    student_id INTEGER NOT NULL,

    offering_id INTEGER NOT NULL,

    enrollment_date DATE,

    status VARCHAR(30),

    CONSTRAINT enrollments_student_fk
        FOREIGN KEY (student_id)
        REFERENCES public.students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT enrollments_offering_fk
        FOREIGN KEY (offering_id)
        REFERENCES public.subject_offerings(offering_id)
        ON DELETE RESTRICT
);