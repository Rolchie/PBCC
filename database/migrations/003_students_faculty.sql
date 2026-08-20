-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 003_students_faculty.sql
-- Purpose:
--   1. Create User Program Assignments table
--   2. Create Students table
--   3. Create Faculty table
-- =====================================================


-- =====================================================
-- USER PROGRAM ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_program_assignments (
    assignment_id SERIAL PRIMARY KEY,

    user_id INTEGER,

    program_id INTEGER,

    status VARCHAR(30),

    CONSTRAINT user_program_assignments_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT user_program_assignments_program_fk
        FOREIGN KEY (program_id)
        REFERENCES public.programs(program_id)
        ON DELETE CASCADE
);


-- =====================================================
-- STUDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.students (
    student_id SERIAL PRIMARY KEY,

    user_id INTEGER,

    student_no VARCHAR(50),

    first_name VARCHAR(100),

    middle_name VARCHAR(100),

    last_name VARCHAR(100),

    sex VARCHAR(20),

    birthdate DATE,

    address TEXT,

    contact_number VARCHAR(30),

    email VARCHAR(100),

    program_id INTEGER,

    curriculum_id INTEGER,

    year_level INTEGER,

    student_type VARCHAR(50),

    status VARCHAR(30),

    CONSTRAINT students_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT students_program_fk
        FOREIGN KEY (program_id)
        REFERENCES public.programs(program_id)
        ON DELETE RESTRICT,

    CONSTRAINT students_curriculum_fk
        FOREIGN KEY (curriculum_id)
        REFERENCES public.curricula(curriculum_id)
        ON DELETE RESTRICT
);


-- =====================================================
-- FACULTY
-- =====================================================

CREATE TABLE IF NOT EXISTS public.faculty (
    faculty_id SERIAL PRIMARY KEY,

    user_id INTEGER,

    employee_no VARCHAR(50),

    first_name VARCHAR(100),

    middle_name VARCHAR(100),

    last_name VARCHAR(100),

    department VARCHAR(150),

    email VARCHAR(100),

    status VARCHAR(30),

    CONSTRAINT faculty_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE CASCADE
);