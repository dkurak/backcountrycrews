-- Season detection functions
-- Auto-detect season boundaries from forecast data (gaps of >14 days = new season)

-- Get the season start/end dates for a given target date
CREATE OR REPLACE FUNCTION get_season_bounds(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(season_start DATE, season_end DATE) AS $$
  WITH ordered AS (
    SELECT DISTINCT valid_date,
           valid_date - LAG(valid_date) OVER (ORDER BY valid_date) AS gap
    FROM forecasts
    ORDER BY valid_date
  ),
  boundaries AS (
    SELECT valid_date,
           SUM(CASE WHEN gap IS NULL OR gap > 14 THEN 1 ELSE 0 END)
             OVER (ORDER BY valid_date) AS season_id
    FROM ordered
  )
  SELECT MIN(valid_date) AS season_start, MAX(valid_date) AS season_end
  FROM boundaries
  WHERE season_id = (
    SELECT b.season_id FROM boundaries b
    WHERE b.valid_date <= target_date
    ORDER BY b.valid_date DESC LIMIT 1
  );
$$ LANGUAGE sql STABLE;

-- List all detected seasons with forecast counts
CREATE OR REPLACE FUNCTION list_seasons()
RETURNS TABLE(season_start DATE, season_end DATE, forecast_count BIGINT) AS $$
  WITH ordered AS (
    SELECT DISTINCT valid_date,
           valid_date - LAG(valid_date) OVER (ORDER BY valid_date) AS gap
    FROM forecasts
    ORDER BY valid_date
  ),
  boundaries AS (
    SELECT valid_date,
           SUM(CASE WHEN gap IS NULL OR gap > 14 THEN 1 ELSE 0 END)
             OVER (ORDER BY valid_date) AS season_id
    FROM ordered
  )
  SELECT MIN(valid_date) AS season_start, MAX(valid_date) AS season_end, COUNT(*) AS forecast_count
  FROM boundaries
  GROUP BY season_id
  ORDER BY MIN(valid_date) DESC;
$$ LANGUAGE sql STABLE;
