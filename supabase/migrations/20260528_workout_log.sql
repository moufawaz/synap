-- Create workout_log table if it doesn't exist
-- Includes all fields used by /api/log-workout

create table if not exists public.workout_log (
  id               uuid        default uuid_generate_v4() primary key,
  user_id          uuid        references public.users(id) on delete cascade not null,
  date             date        default current_date,
  day_name         text,
  workout_plan_id  uuid        references public.workout_plans(id),
  exercises_completed integer,
  total_exercises  integer,
  completion_pct   integer,
  exercises        jsonb,
  duration_min     integer,
  duration_minutes integer,
  notes            text,
  ion_feedback     text,
  logged_at        timestamptz default now(),
  created_at       timestamptz default now()
);

alter table public.workout_log enable row level security;

-- Policy (skip if already exists)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'workout_log'
      and policyname = 'Users can manage own workout logs'
  ) then
    execute $policy$
      create policy "Users can manage own workout logs"
        on public.workout_log
        for all
        using (auth.uid() = user_id)
    $policy$;
  end if;
end
$$;
