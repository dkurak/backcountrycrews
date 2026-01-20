-- Fix trend classification - be smarter about context
-- The previous migration was too naive with keyword matching

-- Reset all trends first
UPDATE forecasts SET trend = NULL;

-- storm_incoming: Only when storm is actually expected/approaching
-- Look for positive indicators, not just the word "storm"
UPDATE forecasts SET trend = 'storm_incoming'
WHERE (
  lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%storm expected%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%storm approaching%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%storm arriving%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%snow expected%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%snow arriving%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%inches expected%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%accumulation expected%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%danger%rise%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%danger is expected to rise%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%loading will%'
  OR lower(bottom_line || ' ' || COALESCE(discussion, '')) LIKE '%new load%'
);

-- worsening: conditions getting worse (but no storm)
UPDATE forecasts SET trend = 'worsening'
WHERE trend IS NULL AND (
  lower(bottom_line) LIKE '%dangerous avalanche conditions%'
  OR lower(bottom_line) LIKE '%heightened avalanche conditions%'
  OR lower(bottom_line) LIKE '%increasing%'
  OR lower(bottom_line) LIKE '%elevated%danger%'
);

-- improving: conditions stabilizing or getting better
UPDATE forecasts SET trend = 'improving'
WHERE trend IS NULL AND (
  lower(bottom_line) LIKE '%adjusting%'
  OR lower(bottom_line) LIKE '%stabiliz%'
  OR lower(bottom_line) LIKE '%decreased%'
  OR lower(bottom_line) LIKE '%isolated%'
  OR lower(bottom_line) LIKE '%stubborn%'
  OR lower(bottom_line) LIKE '%unlikely%'
  OR lower(bottom_line) LIKE '%slowly improved%'
  OR lower(bottom_line) LIKE '%conditions have%improved%'
);

-- Default remaining to steady
UPDATE forecasts SET trend = 'steady'
WHERE trend IS NULL AND bottom_line IS NOT NULL;

-- Verify
SELECT valid_date, zone_id, trend,
  LEFT(bottom_line, 80) as bottom_line_preview
FROM forecasts
ORDER BY valid_date DESC
LIMIT 10;
