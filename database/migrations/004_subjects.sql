-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 004_subjects.sql
-- Purpose: Create Subjects table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subjects (
    subject_id SERIAL PRIMARY KEY,

    subject_code VARCHAR(50) NOT NULL,

    subject_title VARCHAR(150) NOT NULL,

    units INTEGER NOT NULL,

    subject_type VARCHAR(50),

    status VARCHAR(30)
);