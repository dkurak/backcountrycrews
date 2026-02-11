-- Migration 026: Additional Security Fixes
-- Fixes remaining security warnings from Supabase

-- =====================================================
-- 1. Fix RLS Policy Always True on notifications
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Replace with more restrictive policy: authenticated users can create notifications
-- for their own user_id or for trips they organize
CREATE POLICY "Users can create notifications for themselves or their trips"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      -- Can create notifications for themselves
      auth.uid() = user_id OR
      -- Can create notifications for participants in their trips
      auth.uid() IN (
        SELECT user_id FROM tour_posts WHERE id = trip_id
      )
    )
  );

-- =====================================================
-- 2. Fix Function Search Path Mutable warnings
-- =====================================================

-- Fix generate_sample_activity_data
CREATE OR REPLACE FUNCTION generate_sample_activity_data()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  user_ids UUID[];
  organizer_id UUID;
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
  FOR i IN 0..30 LOOP
    trip_date := current_date - (i * 30 || ' days')::interval;
    month := EXTRACT(MONTH FROM trip_date);

    FOR j IN 1..floor(random() * 10 + 5)::integer LOOP
      organizer_id := user_ids[floor(random() * array_length(user_ids, 1) + 1)];

      IF month IN (12, 1, 2, 3) THEN
        activity := 'ski_tour';
      ELSIF month IN (4, 11) THEN
        activity := (ARRAY['ski_tour', 'hike']::activity_type[])[floor(random() * 2 + 1)];
      ELSIF month IN (5, 10) THEN
        activity := (ARRAY['hike', 'mountain_bike', 'trail_run']::activity_type[])[floor(random() * 3 + 1)];
      ELSE
        activity := (ARRAY['mountain_bike', 'offroad', 'hike', 'trail_run', 'mountain_bike']::activity_type[])[floor(random() * 5 + 1)];
      END IF;

      trip_date := trip_date + (floor(random() * 28) || ' days')::interval;

      INSERT INTO tour_posts (
        user_id, title, description, tour_date, tour_time, zone, region,
        meeting_location, experience_required, spots_available, gear_requirements,
        status, activity, activity_details, created_at
      ) VALUES (
        organizer_id,
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
        (ARRAY['northwest', 'southeast'])[floor(random() * 2 + 1)],
        CASE activity
          WHEN 'offroad' THEN (ARRAY['Crested Butte', 'Taylor Park', 'Moab', 'Pitkin'])[floor(random() * 4 + 1)]
          WHEN 'ski_tour' THEN 'Crested Butte'
          ELSE (ARRAY['Crested Butte', 'Gunnison', 'Aspen'])[floor(random() * 3 + 1)]
        END,
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
        CASE
          WHEN trip_date < current_date - interval '7 days' THEN
            (ARRAY['completed', 'completed', 'completed', 'cancelled'])[floor(random() * 4 + 1)]
          WHEN trip_date < current_date THEN 'completed'
          ELSE (ARRAY['open', 'open', 'confirmed', 'full'])[floor(random() * 4 + 1)]
        END,
        activity,
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
        trip_date - (floor(random() * 14) || ' days')::interval
      ) RETURNING id INTO trip_id;

      trip_count := trip_count + 1;

      num_responses := floor(random() * 5 + 2)::integer;

      SELECT ARRAY_AGG(u) INTO random_users
      FROM (
        SELECT u FROM unnest(user_ids) as u
        WHERE u != organizer_id
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

      IF random() > 0.5 THEN
        INSERT INTO tour_messages (tour_id, user_id, content, created_at) VALUES
        (trip_id, organizer_id, 'Looking forward to this! Let me know if plans change.', trip_date - interval '3 days'),
        (trip_id, organizer_id, 'Weather looks good. See everyone at the trailhead!', trip_date - interval '1 day');
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
$$;

-- Fix get_enabled_activities
CREATE OR REPLACE FUNCTION get_enabled_activities()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT ARRAY_AGG(
    REPLACE(key, 'activity.', '')
    ORDER BY (metadata->>'order')::int
  )
  FROM feature_flags
  WHERE key LIKE 'activity.%' AND enabled = true;
$$;

-- Fix is_feature_enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT enabled FROM feature_flags WHERE key = feature_key),
    false
  );
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Migration successfully fixes:
-- 1. RLS Policy Always True on notifications
-- 2. Function Search Path Mutable warnings on all 5 functions
