-- ── SYNAP Schema Additions ───────────────────────────────
-- Run in Supabase SQL Editor after initial schema

-- 1. Fix chat_messages message_type constraint (add new types)
alter table public.chat_messages
  drop constraint if exists chat_messages_message_type_check;

alter table public.chat_messages
  add constraint chat_messages_message_type_check
  check (message_type in ('text', 'suggestion', 'card', 'quickreply', 'workout_card', 'meal_card', 'milestone', 'alert', 'new_plan'));

-- Fix role to accept 'assistant'
alter table public.chat_messages
  drop constraint if exists chat_messages_role_check;

alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('user', 'ion', 'assistant'));

-- 2. Add photo_url to measurements if missing
alter table public.measurements
  add column if not exists photo_url text;

-- 3. Add notes to measurements if missing
alter table public.measurements
  add column if not exists notes text;

-- 4. Create progress-photos storage bucket
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', true)
on conflict (id) do nothing;

-- 5. Storage policies (drop first to avoid conflicts)
drop policy if exists "Users can upload own photos" on storage.objects;
drop policy if exists "Users can view own photos" on storage.objects;
drop policy if exists "Public photos readable" on storage.objects;

create policy "Users can upload own photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Public photos readable"
  on storage.objects for select
  to anon
  using (bucket_id = 'progress-photos');

-- Verify
select 'SYNAP schema additions applied' as status;
