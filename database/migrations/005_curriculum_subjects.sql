-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 005_curriculum_subjects.sql
-- Purpose: Create Curriculum Subjects table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
    curriculum_subject_id SERIAL PRIMARY KEY,

    curriculum_id INTEGER NOT NULL,

    subject_id INTEGER NOT NULL,

    year_level INTEGER NOT NULL,

    semester VARCHAR(30) NOT NULL,

    is_required BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT curriculum_subjects_curriculum_fk
        FOREIGN KEY (curriculum_id)
        REFERENCES public.curricula(curriculum_id)
        ON DELETE CASCADE,

    CONSTRAINT curriculum_subjects_subject_fk
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(subject_id)
        ON DELETE RESTRICT
);