-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 007_sections_periods.sql
-- Purpose:
--   1. Create Academic Periods table
--   2. Create Sections table
-- =====================================================


-- =====================================================
-- ACADEMIC PERIODS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.academic_periods (
    period_id SERIAL PRIMARY KEY,

    school_year VARCHAR(20) NOT NULL,

    semester VARCHAR(30) NOT NULL,

    start_date DATE,

    end_date DATE,

    status VARCHAR(30)
);


-- =====================================================
-- SECTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sections (
    section_id SERIAL PRIMARY KEY,

    section_code VARCHAR(50) NOT NULL,

    program_id INTEGER,

    year_level INTEGER,

    period_id INTEGER,

    capacity INTEGER,

    status VARCHAR(30),

    CONSTRAINT sections_program_fk
        FOREIGN KEY (program_id)
        REFERENCES public.programs(program_id)
        ON DELETE RESTRICT,

    CONSTRAINT sections_period_fk
        FOREIGN KEY (period_id)
        REFERENCES public.academic_periods(period_id)
        ON DELETE RESTRICT
);