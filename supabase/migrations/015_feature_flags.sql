-- Feature Flags for controlling app functionality
-- Allows toggling activities, features, and UI elements without code changes

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (they're public configuration)
CREATE POLICY "Feature flags are publicly readable"
  ON feature_flags FOR SELECT
  USING (true);

-- Only admins can modify feature flags
CREATE POLICY "Only admins can modify feature flags"
  ON feature_flags FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(key) WHERE enabled = true;

-- =====================================================
-- ACTIVITY FLAGS
-- Control which activities are visible in the app
-- =====================================================

INSERT INTO feature_flags (key, enabled, description, metadata) VALUES
  -- Activities - only ski_tour enabled for v1
  ('activity.ski_tour', true, 'Backcountry ski touring', '{"icon": "⛷️", "color": "blue", "order": 1}'),
  ('activity.hike', false, 'Backcountry hiking', '{"icon": "🥾", "color": "yellow", "order": 2}'),
  ('activity.mountain_bike', false, 'Mountain biking', '{"icon": "🚵", "color": "green", "order": 3}'),
  ('activity.trail_run', false, 'Trail running', '{"icon": "🏃", "color": "purple", "order": 4}'),
  ('activity.offroad', false, 'Off-road/4x4', '{"icon": "🛻", "color": "orange", "order": 5}'),
  ('activity.climb', false, 'Climbing', '{"icon": "🧗", "color": "red", "order": 6}'),

  -- Feature flags for other functionality
  ('feature.weather_tab', true, 'Show weather tab with CBAC integration', '{}'),
  ('feature.avalanche_conditions', true, 'Show avalanche danger ratings (ski_tour only)', '{}'),
  ('feature.partner_finder', true, 'Enable partner finder profiles', '{}'),
  ('feature.notifications', true, 'Enable in-app notifications', '{}')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- HELPER FUNCTION: Get enabled activities
-- Returns array of enabled activity keys
-- =====================================================

CREATE OR REPLACE FUNCTION get_enabled_activities()
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(
    REPLACE(key, 'activity.', '')
    ORDER BY (metadata->>'order')::int
  )
  FROM feature_flags
  WHERE key LIKE 'activity.%' AND enabled = true;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- HELPER FUNCTION: Check if feature is enabled
-- =====================================================

CREATE OR REPLACE FUNCTION is_feature_enabled(feature_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT enabled FROM feature_flags WHERE key = feature_key),
    false
  );
$$ LANGUAGE sql STABLE;

-- =====================================================
-- VIEW: Active activities with metadata
-- =====================================================

CREATE OR REPLACE VIEW enabled_activities AS
SELECT
  REPLACE(key, 'activity.', '') as activity,
  metadata->>'icon' as icon,
  metadata->>'color' as color,
  (metadata->>'order')::int as sort_order
FROM feature_flags
WHERE key LIKE 'activity.%' AND enabled = true
ORDER BY (metadata->>'order')::int;

-- =====================================================
-- USAGE NOTES
-- =====================================================

COMMENT ON TABLE feature_flags IS
'Feature flags for controlling app functionality.
Keys use dot notation: activity.ski_tour, feature.weather_tab, etc.
Toggle via: UPDATE feature_flags SET enabled = true WHERE key = ''activity.hike'';';

COMMENT ON FUNCTION get_enabled_activities() IS
'Returns array of enabled activity type strings, e.g., {ski_tour, hike}';

COMMENT ON FUNCTION is_feature_enabled(TEXT) IS
'Check if a specific feature flag is enabled. Usage: SELECT is_feature_enabled(''feature.weather_tab'');';
