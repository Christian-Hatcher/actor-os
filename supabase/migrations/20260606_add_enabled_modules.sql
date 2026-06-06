ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS enabled_modules jsonb
DEFAULT '["dashboard","casting","emails","self_tapes","settings"]'::jsonb;
