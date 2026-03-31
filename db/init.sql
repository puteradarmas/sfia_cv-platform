-- ─────────────────────────────────────────────────────────────────
--  SFIA Skills Intelligence Platform — Database Initialisation
--  Runs automatically on first container start (pgdata volume empty)
--  Re-run: docker compose down -v && docker compose up --build
-- ─────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- for future fuzzy skill search

-- ── ENUM types ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE profile_status AS ENUM ('PENDING', 'IN_REVIEW', 'VALIDATED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE skill_validation_status AS ENUM ('PENDING', 'CONFIRMED', 'CORRECTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── candidates ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS candidates (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(100),
    source_filename VARCHAR(255),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_cv_text     TEXT        -- 90-day retention; SET NULL on expiry
);

CREATE INDEX IF NOT EXISTS idx_candidates_email      ON candidates (email);
CREATE INDEX IF NOT EXISTS idx_candidates_uploaded_at ON candidates (uploaded_at DESC);

-- ── skills_profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills_profiles (
    id           SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    validated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_profiles_candidate ON skills_profiles (candidate_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status    ON skills_profiles (status);

-- ── sfia_skill_records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sfia_skill_records (
    id                SERIAL PRIMARY KEY,
    profile_id        INTEGER      NOT NULL REFERENCES skills_profiles(id) ON DELETE CASCADE,
    sfia_code         VARCHAR(10)  NOT NULL,
    sfia_skill_name   VARCHAR(255) NOT NULL,
    sfia_category     VARCHAR(100),
    estimated_level   SMALLINT     NOT NULL CHECK (estimated_level BETWEEN 1 AND 7),
    validated_level   SMALLINT              CHECK (validated_level BETWEEN 1 AND 7),
    confidence_score  NUMERIC(4,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
    evidence_text     TEXT,                 -- JSON array of CV sentences
    validation_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    validator_note    TEXT
);

CREATE INDEX IF NOT EXISTS idx_skill_records_profile          ON sfia_skill_records (profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_records_sfia_code        ON sfia_skill_records (sfia_code);
CREATE INDEX IF NOT EXISTS idx_skill_records_validation_status ON sfia_skill_records (validation_status);

-- GIN index for future skills search
CREATE INDEX IF NOT EXISTS idx_skill_records_name_trgm
    ON sfia_skill_records USING GIN (sfia_skill_name gin_trgm_ops);

-- ── audit_log ────────────────────────────────────────────────────
-- Immutable: application user granted INSERT only (see below)
CREATE TABLE IF NOT EXISTS audit_log (
    id           SERIAL PRIMARY KEY,
    record_id    INTEGER      NOT NULL REFERENCES sfia_skill_records(id),
    event_type   VARCHAR(50)  NOT NULL,  -- CREATED | LEVEL_CORRECTED | CONFIRMED | REJECTED | APPROVED
    before_state TEXT,                   -- JSON snapshot before event
    after_state  TEXT         NOT NULL,  -- JSON snapshot after event
    actor        VARCHAR(255) NOT NULL,
    event_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_record   ON audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_event_at ON audit_log (event_at DESC);

-- ── Row-level immutability for audit_log ─────────────────────────
-- Prevents UPDATE and DELETE on audit rows from application layer
CREATE OR REPLACE RULE audit_log_no_update AS
    ON UPDATE TO audit_log DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete AS
    ON DELETE TO audit_log DO INSTEAD NOTHING;
