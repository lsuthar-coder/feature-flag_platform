-- migrations/009_flag_variants.sql
-- Adds the flag_variants table.
-- Run AFTER 001_flags.sql.

CREATE TABLE IF NOT EXISTS flag_variants (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id     UUID         NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,    -- 'on'/'off', 'v1'/'v2'/'v3', 'mp3'/'aac'
  value       TEXT         NOT NULL,    -- what evaluateFlag() returns to the caller
  weight      INTEGER      NOT NULL DEFAULT 0
                           CHECK (weight BETWEEN 0 AND 100),
  is_default  BOOLEAN      NOT NULL DEFAULT false,
  sort_order  INTEGER      NOT NULL DEFAULT 0,
  UNIQUE (flag_id, key)
);

CREATE INDEX IF NOT EXISTS idx_variants_flag_id ON flag_variants (flag_id, sort_order);

-- ── Seed boolean variants for any existing flags ───────────────────────────
-- After adding this table, existing boolean flags need on/off variants.
INSERT INTO flag_variants (flag_id, key, value, weight, is_default, sort_order)
SELECT id, 'on',  'true',  0,   true,  1 FROM flags WHERE flag_type = 'boolean'
ON CONFLICT (flag_id, key) DO NOTHING;

INSERT INTO flag_variants (flag_id, key, value, weight, is_default, sort_order)
SELECT id, 'off', 'false', 100, false, 2 FROM flags WHERE flag_type = 'boolean'
ON CONFLICT (flag_id, key) DO NOTHING;
