-- Lock down tourist_usage to service role only

DROP POLICY IF EXISTS "Anyone can check tourist usage" ON tourist_usage;
DROP POLICY IF EXISTS "Anyone can insert tourist usage" ON tourist_usage;
DROP POLICY IF EXISTS "Anyone can update tourist usage" ON tourist_usage;

CREATE POLICY "Service role only" ON tourist_usage
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
