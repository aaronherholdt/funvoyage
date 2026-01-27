-- Usage Tracking Tables for AI Cost Protection
-- Run this migration in your Supabase SQL editor

-- Table for tracking usage per authenticated user (per-day)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_count INTEGER NOT NULL DEFAULT 0,
  last_device_fingerprint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One row per user per day
  UNIQUE(user_id, date)
);

-- Table for tracking tourist (unauthenticated) usage
CREATE TABLE IF NOT EXISTS tourist_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  email TEXT,
  trip_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent same device from multiple entries
  UNIQUE(device_fingerprint)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tourist_usage_fingerprint ON tourist_usage(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_tourist_usage_ip ON tourist_usage(ip_hash);

-- Row Level Security
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE tourist_usage ENABLE ROW LEVEL SECURITY;

-- Policies for usage_tracking (users can only see their own usage)
CREATE POLICY "Users can view their own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for tourist_usage (public can insert, only service role can read all)
CREATE POLICY "Anyone can check tourist usage" ON tourist_usage
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert tourist usage" ON tourist_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update tourist usage" ON tourist_usage
  FOR UPDATE USING (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tourist_usage_updated_at ON tourist_usage;
CREATE TRIGGER update_tourist_usage_updated_at
  BEFORE UPDATE ON tourist_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to safely increment trip count with upsert behavior
CREATE OR REPLACE FUNCTION increment_trip_count(
  p_user_id UUID,
  p_date DATE,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO usage_tracking (user_id, date, trip_count, last_device_fingerprint)
  VALUES (p_user_id, p_date, 1, p_fingerprint)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    trip_count = usage_tracking.trip_count + 1,
    last_device_fingerprint = COALESCE(p_fingerprint, usage_tracking.last_device_fingerprint),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting table (persistent across serverless function restarts)
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(identifier)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);

-- RLS for rate_limits (service role only - no user access)
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "Service role only" ON rate_limits
  FOR ALL USING (false);

-- Function to check and apply rate limit atomically
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_ms INTEGER DEFAULT 60000
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_ms INTEGER,
  remaining INTEGER
) AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
  v_elapsed_ms INTEGER;
BEGIN
  -- Upsert the rate limit record
  INSERT INTO rate_limits (identifier, request_count, window_start)
  VALUES (p_identifier, 1, v_now)
  ON CONFLICT (identifier)
  DO UPDATE SET
    request_count = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - rate_limits.window_start)) * 1000 > p_window_ms
      THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN EXTRACT(EPOCH FROM (v_now - rate_limits.window_start)) * 1000 > p_window_ms
      THEN v_now
      ELSE rate_limits.window_start
    END
  RETURNING request_count, window_start INTO v_request_count, v_window_start;

  v_elapsed_ms := GREATEST(0, (EXTRACT(EPOCH FROM (v_now - v_window_start)) * 1000)::INTEGER);

  RETURN QUERY SELECT
    v_request_count <= p_max_requests AS allowed,
    GREATEST(0, p_window_ms - v_elapsed_ms) AS retry_after_ms,
    GREATEST(0, p_max_requests - v_request_count) AS remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
