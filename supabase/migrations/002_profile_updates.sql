-- Profile Updates: Age, Travel Method, and Trailhead Preferences
-- Run this in your Supabase SQL Editor after 001_user_profiles.sql

-- Add new columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS travel_method TEXT DEFAULT 'skin' CHECK (travel_method IN ('skin', 'snowmobile', 'both')),
ADD COLUMN IF NOT EXISTS preferred_trailheads TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Common CB area trailheads for reference:
-- Skin-accessible:
--   'washington_gulch' - Coney's, etc.
--   'snodgrass' - Snodgrass Mountain
--   'kebler' - Red Lady (winter closure road)
--   'brush_creek' - Brush Creek area
--   'cement_creek' - Cement Creek area
--   'slate_river' - Smith Hill (often low snow)
--
-- Snowmobile-accessible:
--   'paradise_divide' - Paradise Divide
--   'scarp_ridge' - Scarp Ridge
--   'gothic' - Gothic area
--   'etc'

-- Add travel_method to tour_posts for filtering
ALTER TABLE tour_posts
ADD COLUMN IF NOT EXISTS travel_method TEXT DEFAULT 'skin' CHECK (travel_method IN ('skin', 'snowmobile', 'both')),
ADD COLUMN IF NOT EXISTS trailhead TEXT;
