-- ══════════════════════════════════════════════════════════════
-- SYNAP Complete Schema Fix  — run once in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- ── 1. workout_plans ─────────────────────────────────────────
ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS plan_json  jsonb,
  ADD COLUMN IF NOT EXISTS active     boolean DEFAULT false;

UPDATE public.workout_plans
  SET plan_json = plan_data,
      active    = (status = 'active')
  WHERE plan_json IS NULL;

-- ── 2. diet_plans ─────────────────────────────────────────────
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS plan_json  jsonb,
  ADD COLUMN IF NOT EXISTS active     boolean DEFAULT false;

UPDATE public.diet_plans
  SET plan_json = plan_data,
      active    = (status = 'active')
  WHERE plan_json IS NULL;

-- ── 3. workout_log — add logged_at ───────────────────────────
ALTER TABLE public.workout_log
  ADD COLUMN IF NOT EXISTS logged_at  timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS day_name   text,
  ADD COLUMN IF NOT EXISTS exercises  jsonb,
  ADD COLUMN IF NOT EXISTS notes      text;

UPDATE public.workout_log
  SET logged_at = created_at
  WHERE logged_at IS NULL;

-- ── 4. meals_log — add logged_at ─────────────────────────────
ALTER TABLE public.meals_log
  ADD COLUMN IF NOT EXISTS logged_at  timestamptz DEFAULT now();

UPDATE public.meals_log
  SET logged_at = created_at
  WHERE logged_at IS NULL;

-- ── 5. profiles — add missing columns ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id   text,
  ADD COLUMN IF NOT EXISTS subscription_status  text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_plan    text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS work_hours           text,
  ADD COLUMN IF NOT EXISTS ion_gender           text DEFAULT 'male',
  ADD COLUMN IF NOT EXISTS goal_speed           text;

-- ── 6. chat_messages — fix role + message_type constraints ───
ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_role_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_role_check
  CHECK (role IN ('user', 'ion', 'assistant'));

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN (
    'text', 'suggestion', 'card', 'quickreply',
    'workout_card', 'meal_card', 'milestone', 'alert', 'new_plan'
  ));

-- ── 7. Storage bucket for progress photos ────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own photos"   ON storage.objects;
DROP POLICY IF EXISTS "Public photos readable"      ON storage.objects;

CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public photos readable"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'progress-photos');

-- ── Verify all key columns exist ─────────────────────────────
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='workout_plans' AND column_name='plan_json')         AS "wp.plan_json ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='workout_plans' AND column_name='active')            AS "wp.active ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='diet_plans'    AND column_name='plan_json')         AS "dp.plan_json ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='diet_plans'    AND column_name='active')            AS "dp.active ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='workout_log'   AND column_name='logged_at')         AS "wl.logged_at ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='meals_log'     AND column_name='logged_at')         AS "ml.logged_at ✓",
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'      AND column_name='stripe_customer_id') AS "prof.stripe ✓";

-- All values should be 1. If any is 0, that column is still missing.
