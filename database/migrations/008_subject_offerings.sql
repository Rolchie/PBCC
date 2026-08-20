-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 008_subject_offerings.sql
-- Purpose: Create Subject Offerings table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subject_offerings (
    offering_id SERIAL PRIMARY KEY,

    subject_id INTEGER NOT NULL,

    section_id INTEGER NOT NULL,

    period_id INTEGER NOT NULL,

    faculty_id INTEGER,

    schedule TEXT,

    room VARCHAR(100),

    max_slots INTEGER,

    status VARCHAR(30),

    CONSTRAINT subject_offerings_subject_fk
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(subject_id)
        ON DELETE RESTRICT,

    CONSTRAINT subject_offerings_section_fk
        FOREIGN KEY (section_id)
        REFERENCES public.sections(section_id)
        ON DELETE RESTRICT,

    CONSTRAINT subject_offerings_period_fk
        FOREIGN KEY (period_id)
        REFERENCES public.academic_periods(period_id)
        ON DELETE RESTRICT,

    CONSTRAINT subject_offerings_faculty_fk
        FOREIGN KEY (faculty_id)
        REFERENCES public.faculty(faculty_id)
        ON DELETE SET NULL
);