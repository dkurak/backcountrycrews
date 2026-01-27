-- Add 'withdrawn' status to tour_responses
ALTER TABLE tour_responses DROP CONSTRAINT IF EXISTS tour_responses_status_check;
ALTER TABLE tour_responses ADD CONSTRAINT tour_responses_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn'));

-- Add 'participant_withdrawn' notification type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('trip_accepted', 'trip_confirmed', 'participant_withdrawn'));

-- Store withdrawal note separately from the original interest message
ALTER TABLE tour_responses ADD COLUMN IF NOT EXISTS withdrawal_message TEXT;
