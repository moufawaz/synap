-- ── SYNAP Database Schema ────────────────────────────────
-- Run this in Supabase SQL Editor → New Query → Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── users ─────────────────────────────────────────────────
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  language text default 'en' check (language in ('en', 'ar')),
  ion_gender text default 'male' check (ion_gender in ('male', 'female')),
  created_at timestamptz default now()
);
alter table public.users enable row level security;
create policy "Users can read own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);
create policy "Users can insert own data" on public.users for insert with check (auth.uid() = id);

-- ── profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  name text,
  age integer,
  gender text check (gender in ('male', 'female')),
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  goal text,
  goal_target text,
  goal_date text,
  goal_speed text,
  activity_level text,
  training_time text,
  training_days integer,
  session_duration integer,
  gym_access boolean default false,
  equipment text[] default '{}',
  work_schedule text,
  work_hours text,
  wake_time text,
  sleep_time text,
  lunch_break_time text,
  stress_level text,
  sleep_quality text,
  injuries text,
  medical_conditions text,
  supplements text[] default '{}',
  dietary_preference text[] default '{}',
  allergies text,
  foods_loved text,
  foods_hated text,
  meals_per_day integer,
  cooking_ability text,
  food_budget text,
  training_experience text,
  currently_training text,
  training_style text,
  exercises_hated text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can manage own profile" on public.profiles for all using (auth.uid() = user_id);

-- ── measurements ──────────────────────────────────────────
create table if not exists public.measurements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date default current_date,
  weight_kg numeric(5,1),
  neck_cm numeric(5,1),
  shoulders_cm numeric(5,1),
  chest_cm numeric(5,1),
  bicep_left_cm numeric(5,1),
  bicep_right_cm numeric(5,1),
  forearm_left_cm numeric(5,1),
  forearm_right_cm numeric(5,1),
  waist_cm numeric(5,1),
  hips_cm numeric(5,1),
  thigh_left_cm numeric(5,1),
  thigh_right_cm numeric(5,1),
  calf_left_cm numeric(5,1),
  calf_right_cm numeric(5,1),
  wrist_cm numeric(5,1),
  ankle_cm numeric(5,1),
  body_fat_pct numeric(4,1),
  photo_url text,
  notes text,
  created_at timestamptz default now()
);
alter table public.measurements enable row level security;
create policy "Users can manage own measurements" on public.measurements for all using (auth.uid() = user_id);

-- ── diet_plans ────────────────────────────────────────────
create table if not exists public.diet_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  start_date date default current_date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed')),
  calories_daily integer,
  protein_g integer,
  carbs_g integer,
  fats_g integer,
  meals_per_day integer,
  plan_data jsonb,
  created_at timestamptz default now()
);
alter table public.diet_plans enable row level security;
create policy "Users can manage own diet plans" on public.diet_plans for all using (auth.uid() = user_id);

-- ── workout_plans ─────────────────────────────────────────
create table if not exists public.workout_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  start_date date default current_date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed')),
  plan_type text check (plan_type in ('gym', 'home')),
  days_per_week integer,
  session_duration_min integer,
  plan_data jsonb,
  created_at timestamptz default now()
);
alter table public.workout_plans enable row level security;
create policy "Users can manage own workout plans" on public.workout_plans for all using (auth.uid() = user_id);

-- ── meals_log ─────────────────────────────────────────────
create table if not exists public.meals_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date default current_date,
  meal_time text,
  description text,
  calories_estimated integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fats_g numeric(6,1),
  ion_feedback text,
  created_at timestamptz default now()
);
alter table public.meals_log enable row level security;
create policy "Users can manage own meal logs" on public.meals_log for all using (auth.uid() = user_id);

-- ── workout_log ───────────────────────────────────────────
create table if not exists public.workout_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date default current_date,
  workout_plan_id uuid references public.workout_plans(id),
  exercises_completed jsonb,
  completion_pct integer,
  ion_feedback text,
  duration_min integer,
  created_at timestamptz default now()
);
alter table public.workout_log enable row level security;
create policy "Users can manage own workout logs" on public.workout_log for all using (auth.uid() = user_id);

-- ── chat_messages ─────────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  role text check (role in ('user', 'ion')),
  content text,
  message_type text default 'text' check (message_type in ('text', 'suggestion', 'card', 'quickreply')),
  metadata jsonb,
  created_at timestamptz default now()
);
alter table public.chat_messages enable row level security;
create policy "Users can manage own chat" on public.chat_messages for all using (auth.uid() = user_id);

-- ── weight_log ────────────────────────────────────────────
create table if not exists public.weight_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  date date default current_date,
  weight_kg numeric(5,1),
  notes text,
  created_at timestamptz default now()
);
alter table public.weight_log enable row level security;
create policy "Users can manage own weight log" on public.weight_log for all using (auth.uid() = user_id);

-- ── notifications ─────────────────────────────────────────
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  type text,
  title text,
  body text,
  sent_at timestamptz default now(),
  read_at timestamptz,
  channel text check (channel in ('push', 'email'))
);
alter table public.notifications enable row level security;
create policy "Users can manage own notifications" on public.notifications for all using (auth.uid() = user_id);

-- ── Auto-create user row on signup ────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Done!
select 'SYNAP schema created successfully' as status;
