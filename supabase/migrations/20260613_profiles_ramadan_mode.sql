-- Ramadan mode (mini scope): user can flip a switch + set iftar/suhoor times so
-- Ion plans nutrition around the fasting window. Full UX (auto-prompt + training
-- slot + hydration window remap + notifications) lands in a later build.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ramadan_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS iftar_time TEXT;   -- "18:45"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suhoor_time TEXT;  -- "04:00"
