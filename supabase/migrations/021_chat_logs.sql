-- Chat usage logging (anonymous - no user IDs)
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(36) NOT NULL,   -- random UUID from browser localStorage, not tied to any user
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);

ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Anyone (anon key) can insert
CREATE POLICY "Allow anonymous inserts on chat_logs"
  ON chat_logs FOR INSERT
  WITH CHECK (true);

-- Only authenticated users (you, in the Supabase dashboard) can read
CREATE POLICY "Allow authenticated reads on chat_logs"
  ON chat_logs FOR SELECT
  USING (auth.role() = 'authenticated');
