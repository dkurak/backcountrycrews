-- Migration: Add slug column to tour_posts for readable URLs
-- URLs will be in format: /trips/morning-gothic-tour-9e2dd17c

-- Add slug column
ALTER TABLE tour_posts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_tour_posts_slug ON tour_posts(slug);

-- Backfill slugs for existing trips
-- Format: lowercase-title-with-hyphens-shortid
UPDATE tour_posts
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LEFT(title, 50),
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    ),
    '-+', '-', 'g'  -- Replace multiple hyphens with single
  )
) || '-' || LEFT(id::text, 8)
WHERE slug IS NULL;
