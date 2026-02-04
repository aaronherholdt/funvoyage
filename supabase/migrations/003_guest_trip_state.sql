-- Guest trip lifecycle fields for tourist usage

ALTER TABLE tourist_usage
  ADD COLUMN IF NOT EXISTS trip_started BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trip_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS active_session_id TEXT;

-- Backfill legacy rows that only tracked trip_used
UPDATE tourist_usage
SET
  trip_completed = trip_used,
  trip_started = FALSE,
  started_at = COALESCE(started_at, created_at),
  completed_at = CASE
    WHEN trip_used THEN COALESCE(completed_at, updated_at)
    ELSE completed_at
  END,
  active_session_id = NULL
WHERE trip_completed IS DISTINCT FROM trip_used;
