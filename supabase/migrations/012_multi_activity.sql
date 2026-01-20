-- Multi-Activity Support Migration
-- Transforms the ski-touring app into a multi-activity outdoor platform
-- Supports: ski touring, offroading, mountain biking, trail running, hiking, climbing

-- =====================================================
-- 1. SCHEMA CHANGES
-- =====================================================

-- Create activity type enum
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'ski_tour',
    'offroad',
    'mountain_bike',
    'trail_run',
    'hike',
    'climb'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add activity column to tour_posts (default to ski_tour for existing data)
ALTER TABLE tour_posts
ADD COLUMN IF NOT EXISTS activity activity_type NOT NULL DEFAULT 'ski_tour';

-- Add activity-specific details as JSONB
-- ski_tour:     {"vertical_ft": 3000, "skin_track": true, "avalanche_concern": "moderate"}
-- offroad:      {"trail_rating": "difficult", "high_clearance": true, "vehicle_type": "4x4"}
-- mountain_bike: {"distance_mi": 24, "climbing_ft": 4200, "trail_type": "singletrack"}
-- trail_run:    {"distance_mi": 10, "elevation_gain_ft": 2000, "terrain": "technical"}
-- hike:         {"distance_mi": 8, "class": 2, "summit": "Mt. Crested Butte"}
-- climb:        {"grade": "5.10a", "pitches": 4, "style": "trad"}
ALTER TABLE tour_posts
ADD COLUMN IF NOT EXISTS activity_details JSONB DEFAULT '{}';

-- Add region field (more generic than zone)
ALTER TABLE tour_posts
ADD COLUMN IF NOT EXISTS region TEXT;

-- Backfill region from zone for existing records
UPDATE tour_posts SET region = zone WHERE region IS NULL AND zone IS NOT NULL;

-- Add activities array to profiles (what activities user is interested in)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS activities activity_type[] DEFAULT ARRAY['ski_tour']::activity_type[];

-- Add per-activity experience as JSONB
-- Example: {"ski_tour": {"level": "advanced", "years": 5}, "offroad": {"level": "intermediate", "vehicle": "4Runner"}}
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS activity_experience JSONB DEFAULT '{}';

-- Add activities to trailheads (rename conceptually to meeting_points but keep table name)
ALTER TABLE trailheads
ADD COLUMN IF NOT EXISTS activities activity_type[] DEFAULT ARRAY['ski_tour']::activity_type[];

-- Add region to trailheads
ALTER TABLE trailheads
ADD COLUMN IF NOT EXISTS region TEXT;

-- =====================================================
-- 2. INDEXES FOR ACTIVITY FILTERING
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_trips_activity ON tour_posts(activity, tour_date);
CREATE INDEX IF NOT EXISTS idx_trips_region ON tour_posts(region);
CREATE INDEX IF NOT EXISTS idx_trailheads_activities ON trailheads USING GIN(activities);
CREATE INDEX IF NOT EXISTS idx_profiles_activities ON profiles USING GIN(activities);

-- =====================================================
-- 3. MEETING POINTS / TRAILHEADS FOR ALL ACTIVITIES
-- =====================================================

-- Update existing ski trailheads with activity array and region
UPDATE trailheads SET
  activities = ARRAY['ski_tour', 'hike', 'trail_run']::activity_type[],
  region = 'Crested Butte'
WHERE slug IN ('washington_gulch', 'snodgrass', 'brush_creek', 'cement_creek');

UPDATE trailheads SET
  activities = ARRAY['ski_tour', 'mountain_bike', 'hike']::activity_type[],
  region = 'Crested Butte'
WHERE slug = 'kebler';

UPDATE trailheads SET
  activities = ARRAY['ski_tour']::activity_type[],
  region = 'Crested Butte'
WHERE slug IN ('slate_river', 'cb_uphill');

-- Insert new meeting points for various activities
INSERT INTO trailheads (slug, name, description, region, activities, latitude, longitude, sort_order) VALUES
  -- Offroad trailheads
  ('pearl_pass', 'Pearl Pass', 'Historic 4x4 route to Aspen. High clearance required, experienced drivers only.', 'Crested Butte', ARRAY['offroad']::activity_type[], 38.8689, -106.7433, 20),
  ('taylor_park', 'Taylor Park Trading Post', 'Gateway to Taylor Park trails. Meet at the trading post.', 'Taylor Park', ARRAY['offroad', 'mountain_bike', 'hike']::activity_type[], 38.8167, -106.5667, 21),
  ('tincup_pass', 'Tincup Pass', 'Scenic 4x4 pass route. Moderate difficulty.', 'Taylor Park', ARRAY['offroad']::activity_type[], 38.7500, -106.4667, 22),
  ('italian_creek', 'Italian Creek Road', 'Access to alpine lakes and meadows.', 'Taylor Park', ARRAY['offroad', 'hike']::activity_type[], 38.7833, -106.5500, 23),
  ('cumberland_pass', 'Cumberland Pass', 'High alpine pass, moderate 4x4 route.', 'Pitkin', ARRAY['offroad']::activity_type[], 38.6833, -106.4833, 24),

  -- Moab area
  ('lions_back', 'Lions Back', 'Technical slickrock playground.', 'Moab', ARRAY['offroad']::activity_type[], 38.5500, -109.5167, 30),
  ('hells_revenge', 'Hells Revenge Trailhead', 'Famous Moab slickrock trail. Very technical.', 'Moab', ARRAY['offroad']::activity_type[], 38.5750, -109.5333, 31),
  ('poison_spider', 'Poison Spider Mesa', 'Technical mesa trail with stunning views.', 'Moab', ARRAY['offroad', 'mountain_bike']::activity_type[], 38.5667, -109.6000, 32),
  ('kane_creek', 'Kane Creek Road', 'Scenic canyon route, moderate difficulty.', 'Moab', ARRAY['offroad']::activity_type[], 38.5333, -109.5500, 33),

  -- Mountain biking trailheads
  ('401_trailhead', '401 Trailhead (Gothic)', 'Start of the famous 401 trail. Meet at Gothic parking.', 'Crested Butte', ARRAY['mountain_bike', 'hike', 'trail_run']::activity_type[], 38.9583, -106.9889, 40),
  ('lower_loop', 'Lower Loop Parking', 'Access to Lower/Upper Loop, Lupine, Tony''s Trail.', 'Crested Butte', ARRAY['mountain_bike', 'trail_run']::activity_type[], 38.8833, -106.9667, 41),
  ('strand_hill', 'Strand Hill', 'Shuttle access for Strand, Doctor Park.', 'Crested Butte', ARRAY['mountain_bike']::activity_type[], 38.8500, -106.9333, 42),
  ('teocalli', 'Teocalli Trailhead', 'Access to Teocalli Ridge and Brush Creek trails.', 'Crested Butte', ARRAY['mountain_bike', 'hike']::activity_type[], 38.8167, -106.8833, 43),
  ('hartman_rocks', 'Hartman Rocks', 'Year-round trail system outside Gunnison.', 'Gunnison', ARRAY['mountain_bike', 'trail_run', 'hike']::activity_type[], 38.5167, -106.9333, 44),

  -- Trail running / hiking
  ('oh_be_joyful', 'Oh-Be-Joyful', 'Access to Oh-Be-Joyful valley and peaks.', 'Crested Butte', ARRAY['hike', 'trail_run']::activity_type[], 38.9333, -107.0667, 50),
  ('rustlers_gulch', 'Rustlers Gulch', 'Quiet valley with wildflower meadows.', 'Crested Butte', ARRAY['hike', 'trail_run']::activity_type[], 38.9667, -107.0167, 51),
  ('judd_falls', 'Judd Falls Trailhead', 'Easy hike to waterfall, access to longer routes.', 'Crested Butte', ARRAY['hike', 'trail_run']::activity_type[], 38.9583, -106.9889, 52),
  ('west_maroon', 'West Maroon Trailhead', 'Access to Maroon Bells traverse.', 'Aspen', ARRAY['hike', 'trail_run', 'climb']::activity_type[], 39.0833, -106.9500, 53),

  -- Climbing areas
  ('skyland', 'Skyland', 'Crested Butte''s local crag.', 'Crested Butte', ARRAY['climb']::activity_type[], 38.8833, -106.9500, 60),
  ('hartman_boulders', 'Hartman Rocks Bouldering', 'Granite bouldering outside Gunnison.', 'Gunnison', ARRAY['climb']::activity_type[], 38.5167, -106.9333, 61)

ON CONFLICT (slug) DO UPDATE SET
  activities = EXCLUDED.activities,
  region = EXCLUDED.region,
  description = EXCLUDED.description,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- =====================================================
-- 4. SAMPLE DATA GENERATION FUNCTION
-- =====================================================

-- Function to generate rich historical data
-- Call this AFTER creating test users via Supabase Auth
-- Usage: SELECT generate_sample_activity_data();

CREATE OR REPLACE FUNCTION generate_sample_activity_data()
RETURNS TEXT AS $$
DECLARE
  user_ids UUID[];
  user_id UUID;
  trip_id UUID;
  responder_id UUID;
  current_date DATE := CURRENT_DATE;
  trip_date DATE;
  trip_count INTEGER := 0;
  response_count INTEGER := 0;
  message_count INTEGER := 0;
  i INTEGER;
  j INTEGER;
  activity activity_type;
  month INTEGER;
  random_users UUID[];
  num_responses INTEGER;
BEGIN
  -- Get all test user IDs
  SELECT ARRAY_AGG(id) INTO user_ids FROM profiles WHERE is_test_user = true;

  IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) < 5 THEN
    RETURN 'Error: Need at least 5 test users. Found: ' || COALESCE(array_length(user_ids, 1)::text, '0');
  END IF;

  -- Update test user profiles with multi-activity interests
  UPDATE profiles SET
    activities = CASE
      WHEN random() < 0.3 THEN ARRAY['ski_tour', 'mountain_bike', 'hike']::activity_type[]
      WHEN random() < 0.5 THEN ARRAY['ski_tour', 'offroad', 'hike']::activity_type[]
      WHEN random() < 0.7 THEN ARRAY['mountain_bike', 'trail_run', 'hike']::activity_type[]
      ELSE ARRAY['ski_tour', 'mountain_bike', 'offroad', 'hike', 'trail_run']::activity_type[]
    END,
    activity_experience = jsonb_build_object(
      'ski_tour', jsonb_build_object('level', (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])[floor(random() * 4 + 1)], 'years', floor(random() * 15 + 1)),
      'offroad', jsonb_build_object('level', (ARRAY['beginner', 'intermediate', 'advanced'])[floor(random() * 3 + 1)], 'vehicle', (ARRAY['Jeep Wrangler', '4Runner', 'Tacoma', 'Land Cruiser', 'Bronco'])[floor(random() * 5 + 1)]),
      'mountain_bike', jsonb_build_object('level', (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])[floor(random() * 4 + 1)], 'years', floor(random() * 10 + 1))
    )
  WHERE is_test_user = true;

  -- Generate 2+ years of historical data
  -- Loop through past 30 months
  FOR i IN 0..30 LOOP
    trip_date := current_date - (i * 30 || ' days')::interval;
    month := EXTRACT(MONTH FROM trip_date);

    -- Determine seasonal activities
    -- Winter (Nov-Apr): ski touring
    -- Summer (Jun-Sep): mountain biking, offroading, hiking, trail running
    -- Shoulder (May, Oct): hiking, some biking

    -- Generate 5-15 trips per month (simulating active community)
    FOR j IN 1..floor(random() * 10 + 5)::integer LOOP
      -- Pick random user as organizer
      user_id := user_ids[floor(random() * array_length(user_ids, 1) + 1)];

      -- Pick activity based on season
      IF month IN (12, 1, 2, 3) THEN
        activity := 'ski_tour';
      ELSIF month IN (4, 11) THEN
        activity := (ARRAY['ski_tour', 'hike']::activity_type[])[floor(random() * 2 + 1)];
      ELSIF month IN (5, 10) THEN
        activity := (ARRAY['hike', 'mountain_bike', 'trail_run']::activity_type[])[floor(random() * 3 + 1)];
      ELSE -- June-September
        activity := (ARRAY['mountain_bike', 'offroad', 'hike', 'trail_run', 'mountain_bike']::activity_type[])[floor(random() * 5 + 1)];
      END IF;

      -- Randomize the exact date within the month
      trip_date := trip_date + (floor(random() * 28) || ' days')::interval;

      -- Insert the trip
      INSERT INTO tour_posts (
        user_id,
        title,
        description,
        tour_date,
        tour_time,
        zone,
        region,
        meeting_location,
        experience_required,
        spots_available,
        gear_requirements,
        status,
        activity,
        activity_details,
        created_at
      ) VALUES (
        user_id,
        -- Generate contextual titles
        CASE activity
          WHEN 'ski_tour' THEN (ARRAY[
            'Dawn patrol to Coney''s', 'Purple Peak adventure', 'Snodgrass laps',
            'Gothic Mountain tour', 'Schuykill Ridge', 'Red Lady Bowl',
            'Cement Creek exploration', 'Virginia Basin tour', 'Cascade skin',
            'Early morning tour - need partner', 'Mellow tour, all levels welcome',
            'Looking for partners - Richmond Ridge', 'Afley Basin - moderate pace'
          ])[floor(random() * 13 + 1)]
          WHEN 'offroad' THEN (ARRAY[
            'Pearl Pass run', 'Taylor Park exploration', 'Tincup Pass day trip',
            'Moab weekend - Hells Revenge', 'Italian Creek cruise',
            'Cumberland Pass scenic drive', 'Moderate trail day',
            'Technical trail practice', 'Lions Back challenge',
            'Scenic high alpine route', 'Looking for 4x4 group',
            'Jeep run - all skill levels', 'Weekend wheeler meetup'
          ])[floor(random() * 13 + 1)]
          WHEN 'mountain_bike' THEN (ARRAY[
            '401 Trail classic', 'Teocalli Ridge shuttle', 'Lower Loop after work',
            'Doctor Park descent', 'Strand Hill laps', 'Lupine to Upper Loop',
            'Hartman Rocks session', 'Reno-Flag-Bear-Deadman''s',
            'Morning Snodgrass laps', 'Evening trail ride',
            'Looking for riding partners', 'Chill pace, great views',
            'All-day epic planned', 'Trail work then ride'
          ])[floor(random() * 14 + 1)]
          WHEN 'trail_run' THEN (ARRAY[
            'Morning trail run - Woods Walk', '401 to Schofield',
            'Snodgrass hill repeats', 'Oh-Be-Joyful out and back',
            'Lupine/Upper Loop', 'Long run Saturday',
            'Recovery pace, all welcome', 'Speed work at Hartman',
            'Ultra training run', 'Easy trail jog',
            'Looking for running partners', 'Sunrise run'
          ])[floor(random() * 12 + 1)]
          WHEN 'hike' THEN (ARRAY[
            'Judd Falls and beyond', 'West Maroon Pass', 'Oh-Be-Joyful waterfall',
            'Gothic Mountain summit', 'Rustlers Gulch wildflowers',
            '14er attempt - weather permitting', 'Easy hike, dogs welcome',
            'Photography hike - alpine lakes', 'Sunset hike',
            'Looking for hiking partners', 'Moderate pace, scenic route',
            'Backpacking trip planning meetup'
          ])[floor(random() * 12 + 1)]
          ELSE 'Outdoor adventure'
        END,
        -- Description
        CASE activity
          WHEN 'ski_tour' THEN 'Looking for partners to join. Standard avy gear required. We''ll assess conditions and pick the best line.'
          WHEN 'offroad' THEN 'Planning a fun day on the trails. High clearance 4x4 required. Bring recovery gear, snacks, and a sense of adventure.'
          WHEN 'mountain_bike' THEN 'Great trails, good company. Bring water, snacks, and a spare tube. We''ll regroup at junctions.'
          WHEN 'trail_run' THEN 'Join us for a run! We''ll keep a conversational pace. Bring water and layers.'
          WHEN 'hike' THEN 'Beautiful route planned. Bring lunch, water, and layers. Dogs welcome on leash.'
          ELSE 'Join us for an outdoor adventure!'
        END,
        trip_date::date,
        (ARRAY['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '5:30 PM', '6:30 AM', 'Dawn'])[floor(random() * 7 + 1)],
        CASE WHEN activity = 'ski_tour' THEN (ARRAY['northwest', 'southeast'])[floor(random() * 2 + 1)] ELSE NULL END,
        CASE activity
          WHEN 'offroad' THEN (ARRAY['Crested Butte', 'Taylor Park', 'Moab', 'Pitkin'])[floor(random() * 4 + 1)]
          WHEN 'ski_tour' THEN 'Crested Butte'
          ELSE (ARRAY['Crested Butte', 'Gunnison', 'Aspen'])[floor(random() * 3 + 1)]
        END,
        -- Meeting location based on activity
        CASE activity
          WHEN 'ski_tour' THEN (ARRAY['Washington Gulch parking', 'Snodgrass trailhead', 'Gothic Road', 'Kebler Pass', 'Slate River Road'])[floor(random() * 5 + 1)]
          WHEN 'offroad' THEN (ARRAY['Taylor Park Trading Post', 'Pearl Pass trailhead', 'CB South gas station', 'Gunnison Walmart parking'])[floor(random() * 4 + 1)]
          WHEN 'mountain_bike' THEN (ARRAY['Gothic parking', 'Lower Loop parking', 'Strand Hill', 'Hartman Rocks', 'Teocalli trailhead'])[floor(random() * 5 + 1)]
          WHEN 'trail_run' THEN (ARRAY['Lower Loop parking', 'Gothic', 'Snodgrass', 'Town park', 'Oh-Be-Joyful'])[floor(random() * 5 + 1)]
          WHEN 'hike' THEN (ARRAY['Judd Falls', 'Gothic', 'Oh-Be-Joyful', 'Rustlers Gulch', 'Washington Gulch'])[floor(random() * 5 + 1)]
          ELSE 'TBD'
        END,
        (ARRAY['beginner', 'intermediate', 'advanced', 'expert'])[floor(random() * 4 + 1)],
        floor(random() * 5 + 1)::integer,
        CASE activity
          WHEN 'ski_tour' THEN ARRAY['Beacon', 'Probe', 'Shovel']
          WHEN 'offroad' THEN ARRAY['Recovery gear', 'CB radio']
          WHEN 'mountain_bike' THEN ARRAY['Helmet', 'Repair kit']
          WHEN 'climb' THEN ARRAY['Harness', 'Helmet', 'Belay device']
          ELSE ARRAY[]::text[]
        END,
        -- Set status based on date
        CASE
          WHEN trip_date < current_date - interval '7 days' THEN
            (ARRAY['completed', 'completed', 'completed', 'cancelled'])[floor(random() * 4 + 1)]
          WHEN trip_date < current_date THEN 'completed'
          ELSE (ARRAY['open', 'open', 'confirmed', 'full'])[floor(random() * 4 + 1)]
        END,
        activity,
        -- Activity-specific details
        CASE activity
          WHEN 'ski_tour' THEN jsonb_build_object(
            'vertical_ft', (ARRAY[2000, 2500, 3000, 3500, 4000])[floor(random() * 5 + 1)],
            'skin_track', random() > 0.3
          )
          WHEN 'offroad' THEN jsonb_build_object(
            'trail_rating', (ARRAY['easy', 'moderate', 'difficult', 'expert'])[floor(random() * 4 + 1)],
            'high_clearance', true,
            'vehicle_type', '4x4'
          )
          WHEN 'mountain_bike' THEN jsonb_build_object(
            'distance_mi', (ARRAY[8, 12, 18, 24, 30])[floor(random() * 5 + 1)],
            'climbing_ft', (ARRAY[1500, 2500, 3500, 4500])[floor(random() * 4 + 1)]
          )
          WHEN 'trail_run' THEN jsonb_build_object(
            'distance_mi', (ARRAY[5, 8, 10, 15, 20])[floor(random() * 5 + 1)],
            'elevation_gain_ft', (ARRAY[1000, 1500, 2000, 3000])[floor(random() * 4 + 1)]
          )
          WHEN 'hike' THEN jsonb_build_object(
            'distance_mi', (ARRAY[4, 6, 8, 10, 14])[floor(random() * 5 + 1)],
            'class', (ARRAY[1, 2, 2, 3])[floor(random() * 4 + 1)]
          )
          ELSE '{}'::jsonb
        END,
        trip_date - (floor(random() * 14) || ' days')::interval -- Created 0-14 days before trip
      ) RETURNING id INTO trip_id;

      trip_count := trip_count + 1;

      -- Add responses (2-6 people interested per trip)
      num_responses := floor(random() * 5 + 2)::integer;

      -- Get random users excluding organizer
      SELECT ARRAY_AGG(u) INTO random_users
      FROM (
        SELECT u
        FROM unnest(user_ids) as u
        WHERE u != user_id
        ORDER BY random()
        LIMIT num_responses
      ) sub;

      IF random_users IS NOT NULL THEN
        FOREACH responder_id IN ARRAY random_users LOOP
          INSERT INTO tour_responses (tour_id, user_id, message, status, created_at)
          VALUES (
            trip_id,
            responder_id,
            (ARRAY[
              'I''m in! Looking forward to it.',
              'Count me in, sounds great!',
              'I''d love to join. What time should we meet?',
              'This looks perfect for my schedule.',
              'I''m interested! Can I bring a friend?',
              'Been wanting to do this route. I''m in!',
              'Sounds fun, I''ll be there.',
              'Great timing, I was hoping to get out.',
              'I''m available! What should I bring?',
              'Perfect, see you there!'
            ])[floor(random() * 10 + 1)],
            (ARRAY['accepted', 'accepted', 'accepted', 'pending', 'declined'])[floor(random() * 5 + 1)],
            trip_date - (floor(random() * 7) || ' days')::interval
          )
          ON CONFLICT (tour_id, user_id) DO NOTHING;

          response_count := response_count + 1;
        END LOOP;
      END IF;

      -- Add messages for confirmed/completed trips (50% chance)
      IF random() > 0.5 THEN
        INSERT INTO tour_messages (tour_id, user_id, content, created_at) VALUES
        (trip_id, user_id, 'Looking forward to this! Let me know if plans change.', trip_date - interval '3 days'),
        (trip_id, user_id, 'Weather looks good. See everyone at the trailhead!', trip_date - interval '1 day');
        message_count := message_count + 2;

        IF random_users IS NOT NULL AND array_length(random_users, 1) > 0 THEN
          INSERT INTO tour_messages (tour_id, user_id, content, created_at) VALUES
          (trip_id, random_users[1], 'Perfect, I''ll bring snacks!', trip_date - interval '2 days');
          message_count := message_count + 1;
        END IF;
      END IF;

    END LOOP;
  END LOOP;

  RETURN 'Generated ' || trip_count || ' trips, ' || response_count || ' responses, ' || message_count || ' messages';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. HELPER VIEWS
-- =====================================================

-- View to see trips with activity info
CREATE OR REPLACE VIEW trips_with_activity AS
SELECT
  tp.*,
  p.display_name as organizer_name,
  p.avatar_url as organizer_avatar,
  (SELECT count(*) FROM tour_responses tr WHERE tr.tour_id = tp.id AND tr.status = 'accepted') as confirmed_count
FROM tour_posts tp
JOIN profiles p ON tp.user_id = p.id;

-- View for activity statistics
CREATE OR REPLACE VIEW activity_stats AS
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
-- 6. USAGE INSTRUCTIONS
-- =====================================================

-- To generate sample data:
-- 1. First, create at least 5 test users through Supabase Auth dashboard
--    or your admin interface (emails like test1@example.com, test2@example.com)
-- 2. Mark them as test users:
--    UPDATE profiles SET is_test_user = true WHERE email LIKE 'test%@%';
-- 3. Run the sample data generator:
--    SELECT generate_sample_activity_data();
-- 4. Check the results:
--    SELECT activity, count(*), min(tour_date), max(tour_date) FROM tour_posts GROUP BY activity;

COMMENT ON FUNCTION generate_sample_activity_data() IS
'Generates 2+ years of sample activity data across all activity types.
Requires at least 5 test users (is_test_user = true) to exist first.
Creates seasonal trips: ski touring in winter, biking/hiking in summer, etc.';
