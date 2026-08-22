-- migrations/002_flag_audit.sql

CREATE TABLE IF NOT EXISTS flag_audit (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id     UUID         NOT NULL REFERENCES flags(id) ON DELETE CASCADE,
  flag_name   VARCHAR(100) NOT NULL,  -- denormalised: survives even after flag deletion
  action      VARCHAR(30)  NOT NULL
                           CHECK (action IN (
                             'created','updated','deleted','enabled','disabled',
                             'variants_updated','override_added','override_removed'
                           )),
  old_value   JSONB,
  new_value   JSONB,
  changed_by  VARCHAR(100) NOT NULL DEFAULT 'system',
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_flag_id    ON flag_audit (flag_id,   changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON flag_audit (changed_by, changed_at DESC);
