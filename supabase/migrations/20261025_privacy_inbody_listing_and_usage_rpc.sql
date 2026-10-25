-- Privacy fixes flagged by the Supabase security advisor.

-- 1. InBody scans: anyone could LIST every user's uploaded scans.
--    The bucket stays public so existing inbody_url links keep working (public
--    object URLs don't go through RLS), but the broad SELECT policy that
--    allowed listing the whole bucket is replaced by an owner-only one. Upload
--    paths are `<user_id>/<timestamp>.<ext>`, and upsert needs SELECT on the
--    caller's own objects.
drop policy if exists "InBody scans are publicly viewable" on storage.objects;
drop policy if exists "Users can view own inbody scans" on storage.objects;
create policy "Users can view own inbody scans"
on storage.objects for select
to authenticated
using (
  bucket_id = 'inbody-scans'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. increment_message_usage is SECURITY DEFINER and was callable by anyone
--    (even signed out), so any user's daily AI-message count could be pushed
--    to the limit. Only the server (service role) calls it.
revoke execute on function public.increment_message_usage(uuid, date) from public, anon, authenticated;
grant execute on function public.increment_message_usage(uuid, date) to service_role;
alter function public.increment_message_usage(uuid, date) set search_path = public;
