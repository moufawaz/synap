-- Allow internal 'system' rows in chat_messages.
--
-- Two features store bookkeeping rows here with role = 'system':
--   * cron/onboarding-reminder — dedupe markers so each reminder is sent once
--   * workout-session          — the in-progress workout synced across launches
-- The old constraint only allowed ('user','ion','assistant'), so those inserts
-- silently failed: users got the onboarding reminder every day, and workout
-- sessions never persisted. User-facing chat reads filter role to
-- ('user','assistant','ion'), so system rows never show up in chat.

alter table public.chat_messages drop constraint if exists chat_messages_role_check;
alter table public.chat_messages
  add constraint chat_messages_role_check
  check (role in ('user', 'ion', 'assistant', 'system'));
