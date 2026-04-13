-- Weekly reports table for off-season CBAC narrative summaries
-- These are text-based reports (no structured danger levels or problems)

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  body_html TEXT,
  author TEXT,
  report_url TEXT,
  product_id INTEGER UNIQUE,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (report_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_date ON weekly_reports(report_date DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on weekly_reports"
  ON weekly_reports FOR SELECT USING (true);

CREATE POLICY "Allow service role full access on weekly_reports"
  ON weekly_reports FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_weekly_reports_updated_at
  BEFORE UPDATE ON weekly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
