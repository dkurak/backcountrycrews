-- Enhanced user profiles for activity-specific preferences
-- Foundation for Phase 2.5: Collaborative recommendations

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN profiles.profile_data IS 'Activity-specific profile data including style preferences, equipment, favorite routes';

-- Example structure:
-- {
--   "ski_touring": {
--     "equipment": {
--       "has_snowmobile": false,
--       "has_splitboard": false
--     },
--     "style": {
--       "approach": "kiss",
--       "access_preference": "earn_your_turns",
--       "risk_tolerance": "conservative",
--       "group_size": "small"
--     },
--     "favorite_routes": ["Coneys", "Gothic Mountain"],
--     "avoid_routes": [
--       {"route": "Purple Palace", "reason": "too exposed"}
--     ]
--   },
--   "offroad": { ... },
--   "mountain_bike": { ... }
-- }

-- Index for querying profile data
CREATE INDEX IF NOT EXISTS idx_profiles_profile_data ON profiles USING gin (profile_data);
