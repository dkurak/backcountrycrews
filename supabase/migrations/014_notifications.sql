-- Create notifications table for trip acceptance and confirmation alerts

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trip_accepted', 'trip_confirmed')),
  trip_id UUID REFERENCES tour_posts(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries by user
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- RLS: users can only see/manage their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE USING (auth.uid() = user_id);

-- System can create notifications (via service role or authenticated users for their own trips)
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT WITH CHECK (true);
