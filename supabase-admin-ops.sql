-- Admin/business observability tables.
-- Run once in Supabase SQL editor. Safe to re-run.

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'info',
  source text,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists app_events_type_created_idx on public.app_events (event_type, created_at desc);
create index if not exists app_events_user_created_idx on public.app_events (user_id, created_at desc);
create index if not exists app_events_severity_created_idx on public.app_events (severity, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists "admin service role manages app events" on public.app_events;
create policy "admin service role manages app events"
on public.app_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
