-- ==============================================================================
-- AlmaBetter AI-Powered Project Evaluation Engine
-- PostgreSQL 16 Production Database Schema Migration
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Students, Evaluators, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('STUDENT', 'EVALUATOR', 'ADMIN', 'SYSTEM_BOT')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    max_submissions_per_student INT NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_course_due ON assignments(course_id, due_date);

-- 4. Rubrics Table
CREATE TABLE IF NOT EXISTS rubrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rubric_assignment_version UNIQUE (assignment_id, version)
);

-- 5. Rubric Criteria Table
CREATE TABLE IF NOT EXISTS rubric_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
    criterion_key VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    weight_percentage DECIMAL(5, 2) NOT NULL CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    max_points DECIMAL(5, 2) NOT NULL DEFAULT 10.0,
    prompt_guidance TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rubric_criterion_key UNIQUE (rubric_id, criterion_key)
);

CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric ON rubric_criteria(rubric_id, sort_order);

-- 6. Submissions Table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submission_type VARCHAR(32) NOT NULL CHECK (submission_type IN ('GITHUB_REPO', 'ZIP_ARCHIVE', 'PDF_DOCUMENT', 'HYBRID')),
    github_repo_url TEXT,
    commit_hash VARCHAR(64),
    s3_archive_key TEXT,
    live_url TEXT,
    student_notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'UPLOAD_PENDING', 'UPLOADED', 'QUEUED', 'EVALUATING', 'NEEDS_REVIEW', 'EVALUATED', 'FAILED')),
    attempt_number INT NOT NULL DEFAULT 1,
    idempotency_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student ON submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_idempotency ON submissions(idempotency_hash);

-- 7. Submission Files & Embeddings (Hierarchical Project Understanding)
CREATE TABLE IF NOT EXISTS submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    size_bytes INT NOT NULL,
    file_type VARCHAR(32) NOT NULL,
    summary_text TEXT,
    ast_metadata JSONB,
    embedding_vector vector(1536), -- text-embedding-3-small
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_files_sub ON submission_files(submission_id);
-- HNSW Vector Index for High-Performance Nearest-Neighbor RAG Search
CREATE INDEX IF NOT EXISTS idx_submission_files_hnsw ON submission_files 
USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 8. Evaluation Jobs Table
CREATE TABLE IF NOT EXISTS evaluation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'EXTRACTING', 'STATIC_ANALYSIS', 'AI_RUBRIC_ASSESSMENT', 'SCORE_AGGREGATION', 'COMPLETED', 'FAILED')),
    progress_percentage INT NOT NULL DEFAULT 0,
    current_stage VARCHAR(64) NOT NULL DEFAULT 'QUEUED',
    current_retry_count INT NOT NULL DEFAULT 0,
    assigned_worker_id VARCHAR(64),
    heartbeat_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 1, -- Optimistic concurrency control
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_jobs_worker ON evaluation_jobs(assigned_worker_id, heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_eval_jobs_status ON evaluation_jobs(status);

-- 9. Evaluation Attempts Table (Immutable Forensic Audit Trail)
CREATE TABLE IF NOT EXISTS evaluation_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES evaluation_jobs(id) ON DELETE CASCADE,
    attempt_index INT NOT NULL,
    llm_provider VARCHAR(64) NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    total_tokens_used INT NOT NULL DEFAULT 0,
    cost_usd DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
    outcome VARCHAR(32) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILED', 'TIMEOUT', 'SCHEMA_ERROR')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eval_attempts_job ON evaluation_attempts(job_id);

-- 10. Evaluation Results Table
CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID UNIQUE NOT NULL REFERENCES evaluation_jobs(id) ON DELETE CASCADE,
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    overall_score DECIMAL(5, 2) NOT NULL,
    confidence_score DECIMAL(3, 2) NOT NULL,
    requires_human_review BOOLEAN NOT NULL DEFAULT false,
    review_reason VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'PENDING_HUMAN_REVIEW', 'IN_HUMAN_REVIEW', 'PUBLISHED_AFTER_HUMAN_REVIEW')),
    key_strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    areas_for_improvement JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_llm_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Criteria Scores Table (Per-Dimension Granular Breakdown)
CREATE TABLE IF NOT EXISTS criteria_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_result_id UUID NOT NULL REFERENCES evaluation_results(id) ON DELETE CASCADE,
    rubric_criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE RESTRICT,
    score_assigned DECIMAL(5, 2) NOT NULL,
    max_possible DECIMAL(5, 2) NOT NULL,
    feedback TEXT NOT NULL,
    evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criteria_scores_result ON criteria_scores(evaluation_result_id);

-- 12. Human Reviews Table
CREATE TABLE IF NOT EXISTS human_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_result_id UUID NOT NULL REFERENCES evaluation_results(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    dispute_reason VARCHAR(64) NOT NULL,
    student_notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_MENTOR_REVIEW' CHECK (status IN ('PENDING_MENTOR_REVIEW', 'IN_REVIEW', 'RESOLVED', 'REJECTED')),
    decision VARCHAR(32) CHECK (decision IN ('APPROVED_AS_IS', 'OVERRIDE_SCORE', 'REJECT_DISPUTE')),
    original_score DECIMAL(5, 2),
    adjusted_score DECIMAL(5, 2),
    reviewer_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_human_reviews_status ON human_reviews(status);
