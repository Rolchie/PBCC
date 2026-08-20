-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 006_subject_prerequisites.sql
-- Purpose: Create Subject Prerequisites table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subject_prerequisites (
    prerequisite_id SERIAL PRIMARY KEY,

    subject_id INTEGER NOT NULL,

    prerequisite_subject_id INTEGER NOT NULL,

    minimum_grade VARCHAR(10),

    status VARCHAR(30),

    CONSTRAINT subject_prerequisites_subject_fk
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(subject_id)
        ON DELETE CASCADE,

    CONSTRAINT subject_prerequisites_prerequisite_subject_fk
        FOREIGN KEY (prerequisite_subject_id)
        REFERENCES public.subjects(subject_id)
        ON DELETE RESTRICT
);