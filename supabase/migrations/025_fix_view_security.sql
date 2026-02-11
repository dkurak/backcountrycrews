-- Migration 025: Fix View Security Issues
-- Recreate views with SECURITY INVOKER to enforce RLS properly
-- This fixes Supabase security warnings about SECURITY DEFINER views

-- =====================================================
-- Fix enabled_activities view
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS enabled_activities;

-- Recreate with SECURITY INVOKER
CREATE VIEW enabled_activities
WITH (security_invoker = true)
AS
SELECT
  REPLACE(key, 'activity.', '') as activity,
  metadata->>'icon' as icon,
  metadata->>'color' as color,
  (metadata->>'order')::int as sort_order
FROM feature_flags
WHERE key LIKE 'activity.%' AND enabled = true
ORDER BY (metadata->>'order')::int;

-- =====================================================
-- Fix trips_with_activity view
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS trips_with_activity;

-- Recreate with SECURITY INVOKER
CREATE VIEW trips_with_activity
WITH (security_invoker = true)
AS
SELECT
  tp.*,
  p.display_name as organizer_name,
  p.avatar_url as organizer_avatar,
  (SELECT count(*) FROM tour_responses tr WHERE tr.tour_id = tp.id AND tr.status = 'accepted') as confirmed_count
FROM tour_posts tp
JOIN profiles p ON tp.user_id = p.id;

-- =====================================================
-- Fix activity_stats view
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS activity_stats;

-- Recreate with SECURITY INVOKER
CREATE VIEW activity_stats
WITH (security_invoker = true)
AS
SELECT
  activity,
  count(*) as total_trips,
  count(*) FILTER (WHERE status = 'completed') as completed_trips,
  count(DISTINCT user_id) as unique_organizers,
  date_trunc('month', tour_date) as month
FROM tour_posts
GROUP BY activity, date_trunc('month', tour_date)
ORDER BY month DESC, total_trips DESC;

-- =====================================================
-- VERIFICATION
-- =====================================================

COMMENT ON VIEW enabled_activities IS
'Lists enabled activity types with metadata. Uses SECURITY INVOKER to enforce RLS.';

COMMENT ON VIEW trips_with_activity IS
'Trips with organizer info and response counts. Uses SECURITY INVOKER to enforce RLS.';

COMMENT ON VIEW activity_stats IS
'Activity statistics by month. Uses SECURITY INVOKER to enforce RLS.';
