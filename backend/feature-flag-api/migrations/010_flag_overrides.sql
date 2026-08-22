-- migrations/010_flag_overrides.sql
-- Per-user override table.
-- Run AFTER 009_flag_variants.sql.

CREATE TABLE IF NOT EXISTS flag_overrides (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id     UUID         NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  user_id     VARCHAR(100) NOT NULL,    -- JWT sub claim (userId)
  variant_key VARCHAR(100) NOT NULL,    -- must match a key in flag_variants
  created_by  VARCHAR(100) NOT NULL DEFAULT 'system',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (flag_id, user_id)             -- one override per user per flag
);

CREATE INDEX IF NOT EXISTS idx_overrides_flag_user ON flag_overrides (flag_id, user_id);
