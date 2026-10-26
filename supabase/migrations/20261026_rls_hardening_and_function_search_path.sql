-- Supabase security advisor: overly permissive RLS write policies and
-- SECURITY DEFINER functions without a fixed search_path.
--
-- All writes to these tables now come from the server with the service role
-- (which bypasses RLS), so the open write policies only let any user — or a
-- signed-out client with the anon key — insert/overwrite other users' rows.
-- Deploy the matching code first (exercise-video + supplement-gen use the
-- admin client), then run this.

-- exercise_videos: shared cache. Public read stays; anyone could write/delete.
drop policy if exists "exercise_videos_write" on public.exercise_videos;

-- supplement_recommendations: users read their own; inserts are server-only.
drop policy if exists "supprecs_insert_service" on public.supplement_recommendations;

-- weekly_reports: users read their own; the weekly cron writes them.
drop policy if exists "weekly_reports_insert_service" on public.weekly_reports;
drop policy if exists "weekly_reports_update_service" on public.weekly_reports;

-- Fixed search_path on functions (all references are schema-qualified or
-- built-ins, so 'public' is safe).
alter function public.handle_new_user() set search_path = public;
alter function public.set_profile_trial_ends_at() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;

-- Trigger-only SECURITY DEFINER functions don't need to be callable through
-- the API (triggers don't check EXECUTE when they fire).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_profile_trial_ends_at() from public, anon, authenticated;
