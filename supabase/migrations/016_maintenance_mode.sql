-- Migration: Add maintenance mode feature flag
-- This enables site-wide maintenance mode with optional bypass password

INSERT INTO feature_flags (key, enabled, metadata, description)
VALUES (
  'system.maintenance_mode',
  false,
  '{"bypass_password": null, "message": "We are currently working on something exciting. Check back soon!", "bypass_version": 0}',
  'Enable site-wide maintenance mode - visitors see a coming soon page'
)
ON CONFLICT (key) DO UPDATE SET
  metadata = EXCLUDED.metadata,
  description = EXCLUDED.description;
