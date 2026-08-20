-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 011_system_support.sql
-- Purpose:
--   1. Create Student Credited Subjects
--   2. Create Public Knowledge Base
--   3. Create Inquiry Logs
--   4. Create Audit Logs
-- =====================================================


-- =====================================================
-- STUDENT CREDITED SUBJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.student_credited_subjects (
    credit_id SERIAL PRIMARY KEY,

    student_id INTEGER NOT NULL,

    subject_id INTEGER NOT NULL,

    equivalent_subject_title VARCHAR(150),

    source_school VARCHAR(150),

    grade_value VARCHAR(10),

    remarks TEXT,

    validated_by INTEGER,

    validated_at TIMESTAMP,

    status VARCHAR(30),

    CONSTRAINT student_credited_subjects_student_fk
        FOREIGN KEY (student_id)
        REFERENCES public.students(student_id)
        ON DELETE CASCADE,

    CONSTRAINT student_credited_subjects_subject_fk
        FOREIGN KEY (subject_id)
        REFERENCES public.subjects(subject_id)
        ON DELETE RESTRICT,

    CONSTRAINT student_credited_subjects_validator_fk
        FOREIGN KEY (validated_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- =====================================================
-- PUBLIC KNOWLEDGE BASE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.public_knowledge_base (
    knowledge_id SERIAL PRIMARY KEY,

    title VARCHAR(150),

    content TEXT,

    category VARCHAR(100),

    status VARCHAR(30),

    created_by INTEGER,

    updated_at TIMESTAMP,

    CONSTRAINT public_knowledge_base_creator_fk
        FOREIGN KEY (created_by)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- =====================================================
-- INQUIRY LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inquiry_logs (
    inquiry_id SERIAL PRIMARY KEY,

    user_id INTEGER,

    inquiry_type VARCHAR(50),

    query_text TEXT,

    response_text TEXT,

    response_type VARCHAR(50),

    created_at TIMESTAMP,

    CONSTRAINT inquiry_logs_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);


-- =====================================================
-- AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    audit_id SERIAL PRIMARY KEY,

    user_id INTEGER,

    action VARCHAR(150),

    table_name VARCHAR(100),

    record_id INTEGER,

    timestamp TIMESTAMP,

    ip_address VARCHAR(50),

    CONSTRAINT audit_logs_user_fk
        FOREIGN KEY (user_id)
        REFERENCES public.users(user_id)
        ON DELETE SET NULL
);