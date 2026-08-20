-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 010_grades.sql
-- Purpose: Create Grades table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.grades (
    grade_id SERIAL PRIMARY KEY,

    enrollment_id INTEGER NOT NULL,

    grade VARCHAR(20),

    remarks VARCHAR(100),

    date_posted DATE,

    status VARCHAR(30),

    CONSTRAINT grades_enrollment_fk
        FOREIGN KEY (enrollment_id)
        REFERENCES public.enrollments(enrollment_id)
        ON DELETE CASCADE
);