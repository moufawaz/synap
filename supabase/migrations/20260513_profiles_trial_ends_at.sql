-- Add trial_ends_at to profiles
-- Trial period = 7 days from auth signup (not profile creation)
-- Trigger auto-sets it so no API code needs to set it manually

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Trigger function: reads auth.users.created_at so trial starts from signup, not profile save
CREATE OR REPLACE FUNCTION set_profile_trial_ends_at()
RETURNS TRIGGER AS $$
DECLARE
  user_created_at TIMESTAMPTZ;
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    SELECT created_at INTO user_created_at FROM auth.users WHERE id = NEW.user_id;
    NEW.trial_ends_at := COALESCE(user_created_at, NOW()) + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_profile_trial ON profiles;
CREATE TRIGGER trg_set_profile_trial
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_trial_ends_at();

-- Backfill existing profiles (trial already expired for old users — that's correct)
UPDATE profiles
SET trial_ends_at = (
  SELECT created_at FROM auth.users WHERE id = profiles.user_id
) + INTERVAL '7 days'
WHERE trial_ends_at IS NULL;
