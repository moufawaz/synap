-- Sparks loyalty points: behavior-based rewards redeemable for Elite days.
-- Run in Supabase Studio SQL editor.
--
-- Design notes:
--  - loyalty_points is an append-only LEDGER. Balance = SUM(points).
--    Redemptions are inserted as NEGATIVE rows so one query answers balance
--    and one table is the audit trail.
--  - unique (user_id, event_type, ref_id) is the idempotency backbone:
--    earning hooks pick ref_id so replays/caps work naturally
--    (e.g. workout_completed ref = the date → max once/day).
--  - Tables are RLS-enabled with NO policies: clients can't touch them at
--    all; every read/write goes through API routes with the service role.
--  - profiles.bonus_elite_until: Elite entitlement granted by redemptions.
--    effectivePlan() honors it after paid subs and before starter.

create table if not exists loyalty_points (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points     int  not null,
  ref_id     text not null,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, ref_id)
);

create index if not exists loyalty_points_user_created
  on loyalty_points (user_id, created_at desc);

create table if not exists loyalty_redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  reward_type  text not null,
  points_spent int  not null,
  days_granted int  not null,
  status       text not null default 'granted',
  created_at   timestamptz not null default now()
);

create index if not exists loyalty_redemptions_user
  on loyalty_redemptions (user_id, created_at desc);

alter table loyalty_points      enable row level security;
alter table loyalty_redemptions enable row level security;

alter table profiles add column if not exists bonus_elite_until timestamptz;
