-- AI usage and token cost tracking.
-- Run this once in the Supabase SQL editor before relying on Admin > Token Costs.

create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature text not null,
  model text not null,
  input_tokens integer default 0,
  output_tokens integer default 0,
  cache_write_tokens integer default 0,
  cache_read_tokens integer default 0,
  total_tokens integer default 0,
  estimated_cost_usd numeric(12, 6) default 0,
  created_at timestamptz default now()
);

create index if not exists ai_usage_log_user_created_idx on public.ai_usage_log (user_id, created_at desc);
create index if not exists ai_usage_log_feature_created_idx on public.ai_usage_log (feature, created_at desc);

alter table public.ai_usage_log enable row level security;

drop policy if exists "admin service role manages ai usage" on public.ai_usage_log;
create policy "admin service role manages ai usage"
on public.ai_usage_log
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
