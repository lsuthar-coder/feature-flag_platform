-- migrations/000_functions.sql
-- ─────────────────────────────────────────────
-- Shared PostgreSQL helper functions.
-- Run this FIRST before any other migration.
-- Used by flags table (and routes table in api-gateway).
-- ─────────────────────────────────────────────

-- Auto-update the updated_at column on every UPDATE.
-- Applied as a BEFORE UPDATE trigger on the flags table.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
