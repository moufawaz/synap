-- ═══════════════════════════════════════════════════════════════
-- SYNAP Monetization Schema
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id TEXT UNIQUE,
  lemon_squeezy_customer_id     TEXT,
  lemon_squeezy_order_id        TEXT,
  variant_id                    TEXT,
  plan_name                     TEXT NOT NULL DEFAULT 'free',   -- free | pro | unlimited
  billing_period                TEXT,                           -- monthly | annual
  status                        TEXT NOT NULL DEFAULT 'free',   -- free | trial | active | cancelled | expired | past_due
  trial_ends_at                 TIMESTAMPTZ,
  current_period_ends_at        TIMESTAMPTZ,
  cancelled_at                  TIMESTAMPTZ,
  pause_ends_at                 TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

-- ── add_ons ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS add_ons (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id TEXT,
  variant_id                    TEXT,
  addon_type                    TEXT NOT NULL,  -- extra_chat
  active                        BOOLEAN DEFAULT true,
  created_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- ── message_usage ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT message_usage_user_date_unique UNIQUE (user_id, date)
);

-- ── billing_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_events (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type               TEXT NOT NULL,
  lemon_squeezy_event_name TEXT,
  payload                  JSONB,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ── indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx       ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx        ON subscriptions (status);
CREATE INDEX IF NOT EXISTS add_ons_user_id_idx             ON add_ons (user_id);
CREATE INDEX IF NOT EXISTS message_usage_user_date_idx     ON message_usage (user_id, date);
CREATE INDEX IF NOT EXISTS billing_events_user_id_idx      ON billing_events (user_id);
CREATE INDEX IF NOT EXISTS billing_events_created_at_idx   ON billing_events (created_at);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_ons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_usage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events  ENABLE ROW LEVEL SECURITY;

-- subscriptions: users can only read their own
CREATE POLICY "users_read_own_subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- add_ons: users can only read their own
CREATE POLICY "users_read_own_addons"
  ON add_ons FOR SELECT
  USING (auth.uid() = user_id);

-- message_usage: users can read & upsert their own
CREATE POLICY "users_read_own_usage"
  ON message_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_upsert_own_usage"
  ON message_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_usage"
  ON message_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- billing_events: only service role can write (webhook)
-- No user-facing SELECT policy — admin only via service role

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── increment_message_usage RPC function ─────────────────────
-- Called from the chat API to atomically increment daily usage
CREATE OR REPLACE FUNCTION increment_message_usage(p_user_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO message_usage (user_id, date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET count = message_usage.count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── seed free subscription row for existing users ─────────────
-- Run this once to backfill existing users:
-- INSERT INTO subscriptions (user_id, plan_name, status)
-- SELECT id, 'free', 'free' FROM auth.users
-- ON CONFLICT (user_id) DO NOTHING;
