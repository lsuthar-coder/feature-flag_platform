-- migrations/001_flags.sql
-- Run: psql $DATABASE_URL -f migrations/001_flags.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS flags (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  enabled     BOOLEAN      NOT NULL DEFAULT false,  -- kept for legacy /status endpoint
  flag_type   VARCHAR(20)  NOT NULL DEFAULT 'boolean'
                           CHECK (flag_type IN ('boolean','string','number','multivariate')),
  environment VARCHAR(20)  NOT NULL DEFAULT 'production'
                           CHECK (environment IN ('development','staging','production')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER flags_updated_at
  BEFORE UPDATE ON flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_flags_name        ON flags (name);
CREATE INDEX IF NOT EXISTS idx_flags_environment ON flags (environment, flag_type);
