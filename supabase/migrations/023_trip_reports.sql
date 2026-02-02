-- Add trip report fields to tour_posts
-- Allows organizers to submit post-trip reports with ratings, conditions, and summary

ALTER TABLE tour_posts
  ADD COLUMN IF NOT EXISTS trip_report JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS report_submitted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering trips with reports
CREATE INDEX IF NOT EXISTS idx_tour_posts_report ON tour_posts(report_submitted_at)
  WHERE report_submitted_at IS NOT NULL;

COMMENT ON COLUMN tour_posts.trip_report IS 'Post-trip report with rating, activity-specific conditions, and summary';
COMMENT ON COLUMN tour_posts.report_submitted_at IS 'Timestamp when trip report was submitted';

-- Trip Report JSONB structure:
-- {
--   "overall_rating": 1-5,
--   "summary": "Trip went great...",
--   "conditions": {
--     // Activity-specific fields
--     // ski_tour: snow_quality, dangers_noticed, skintrack_condition, descent_quality
--     // offroad: trail_condition, obstacles, difficulty_rating
--     // mountain_bike: trail_condition, obstacles
--     // hike/trail_run: trail_condition, obstacles
--     // climb: route_condition, rock_quality, difficulty_rating
--   }
-- }
