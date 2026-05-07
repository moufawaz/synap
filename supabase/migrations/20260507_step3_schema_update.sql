-- ============================================================
-- Step 3: Database schema update
-- - Drop add_ons table (no longer used)
-- - Update subscriptions plan_type values to new tier names
-- - Add plan_tier computed column helper
-- - Create weekly_reports table
-- - Create supplement_recommendations table
-- - Create community_posts table
-- - Create user_wearable_interests table
-- ============================================================

-- ── 1. Drop old add_ons table ─────────────────────────────────────────────────
DROP TABLE IF EXISTS add_ons CASCADE;

-- ── 2. Update subscriptions plan_type values ──────────────────────────────────
-- Rename old plan names to new tier names where possible
UPDATE subscriptions SET plan_type = 'starter'  WHERE plan_type IN ('free',            'FREE');
UPDATE subscriptions SET plan_type = 'pro'       WHERE plan_type IN ('pro',             'Pro', 'PRO');
UPDATE subscriptions SET plan_type = 'elite'     WHERE plan_type IN ('pro_unlimited',   'Pro+Unlimited', 'PRO_UNLIMITED', 'unlimited');

-- ── 3. Add plan_tier column to subscriptions (if not exists) ──────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN plan_type = 'elite'   THEN 'elite'
      WHEN plan_type = 'pro'     THEN 'pro'
      ELSE 'starter'
    END
  ) STORED;

-- ── 4. weekly_reports ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start   DATE        NOT NULL,
  week_end     DATE        NOT NULL,
  report_html  TEXT,
  report_md    TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weekly_reports_select_own" ON weekly_reports;
CREATE POLICY "weekly_reports_select_own"
  ON weekly_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "weekly_reports_insert_service" ON weekly_reports;
CREATE POLICY "weekly_reports_insert_service"
  ON weekly_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "weekly_reports_update_service" ON weekly_reports;
CREATE POLICY "weekly_reports_update_service"
  ON weekly_reports FOR UPDATE
  USING (true);

-- ── 5. supplement_recommendations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplement_recommendations (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number   INT         NOT NULL DEFAULT 1,
  recommendations JSONB      NOT NULL DEFAULT '[]',
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE supplement_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "supprecs_select_own" ON supplement_recommendations;
CREATE POLICY "supprecs_select_own"
  ON supplement_recommendations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "supprecs_insert_service" ON supplement_recommendations;
CREATE POLICY "supprecs_insert_service"
  ON supplement_recommendations FOR INSERT
  WITH CHECK (true);

-- ── 6. community_posts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  image_url   TEXT,
  likes       INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_select_all" ON community_posts;
CREATE POLICY "community_posts_select_all"
  ON community_posts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "community_posts_insert_own" ON community_posts;
CREATE POLICY "community_posts_insert_own"
  ON community_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_posts_update_own" ON community_posts;
CREATE POLICY "community_posts_update_own"
  ON community_posts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "community_posts_delete_own" ON community_posts;
CREATE POLICY "community_posts_delete_own"
  ON community_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ── 7. user_wearable_interests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_wearable_interests (
  user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  device      TEXT,         -- e.g. 'apple_watch', 'fitbit', 'garmin'
  notified    BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_wearable_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wearable_interests_own" ON user_wearable_interests;
CREATE POLICY "wearable_interests_own"
  ON user_wearable_interests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Done ──────────────────────────────────────────────────────────────────────
