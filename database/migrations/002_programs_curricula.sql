-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 002_programs_curricula.sql
-- Purpose: Create Programs and Curricula tables
-- =====================================================

-- -----------------------------------------------------
-- PROGRAMS
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.programs (
    program_id SERIAL PRIMARY KEY,

    program_code VARCHAR(50) NOT NULL,

    program_name VARCHAR(150) NOT NULL,

    degree_level VARCHAR(50) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    CONSTRAINT programs_status_check
        CHECK (
            status IN ('active', 'inactive')
        )
);


-- -----------------------------------------------------
-- CURRICULA
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.curricula (
    curriculum_id SERIAL PRIMARY KEY,

    program_id INTEGER NOT NULL,

    curriculum_year VARCHAR(20) NOT NULL,

    description TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'active',

    CONSTRAINT curricula_program_fk
        FOREIGN KEY (program_id)
        REFERENCES public.programs(program_id)
        ON DELETE RESTRICT,

    CONSTRAINT curricula_status_check
        CHECK (
            status IN ('active', 'inactive')
        )
);