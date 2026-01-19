-- Add visibility setting for tours
-- Users can control whether their name appears on tours they join

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS show_on_tours BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN profiles.show_on_tours IS 'Whether to show this user''s name on tours they have joined (accepted responses)';
