-- =====================================================
-- PBCC Student Enrollment System
-- Migration: 001_users.sql
-- Purpose: Create the Users table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
    user_id SERIAL PRIMARY KEY,

    auth_user_id UUID UNIQUE
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    username VARCHAR(100) UNIQUE NOT NULL,

    password_hash TEXT,

    role VARCHAR(50) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_role_check
        CHECK (
            role IN (
                'Student',
                'Faculty',
                'Program Office Personnel',
                'Registrar Personnel',
                'Administrator'
            )
        ),

    CONSTRAINT users_status_check
        CHECK (
            status IN (
                'active',
                'inactive'
            )
        )
);