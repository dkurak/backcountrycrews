-- Add attendance tracking to tour_responses
-- NULL = not yet marked (trip not completed or attendance not recorded)
-- TRUE = participant attended
-- FALSE = participant did not attend (no-show)

ALTER TABLE tour_responses
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT NULL;

-- Add index for filtering attended participants
CREATE INDEX IF NOT EXISTS idx_tour_responses_attended
  ON tour_responses(tour_id, attended)
  WHERE attended IS NOT NULL;

COMMENT ON COLUMN tour_responses.attended IS 'Whether the participant attended the completed trip. NULL = not yet marked, TRUE = attended, FALSE = no-show';
