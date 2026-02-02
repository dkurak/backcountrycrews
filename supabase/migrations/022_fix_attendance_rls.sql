-- Fix RLS policy for tour organizers to update attendance
-- The existing "Post owners can update response status" policy needs WITH CHECK clause

-- Drop the old policy
DROP POLICY IF EXISTS "Post owners can update response status" ON tour_responses;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Post owners can update response status"
  ON tour_responses FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM tour_posts WHERE id = tour_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM tour_posts WHERE id = tour_id));

-- Ensure tour organizers can update attendance specifically
-- This is redundant but explicit for clarity
COMMENT ON POLICY "Post owners can update response status" ON tour_responses IS
  'Allows tour organizers to update response status and attendance fields';
