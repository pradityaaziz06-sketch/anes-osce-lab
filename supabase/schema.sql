-- ANES OSCE LAB · Supabase schema (PostgreSQL)
-- Run in: Supabase Dashboard -> SQL Editor. Safe to re-run.
-- "users" = Supabase's built-in auth.users; app data hangs off public.profiles.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default 'Student',
  student_id  text not null default '',
  program     text not null default 'D4 Keperawatan Anestesiologi',
  semester    text not null default '',
  role        text not null default 'student' check (role in ('student','admin')),
  xp          integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------------ content
create table if not exists public.categories (
  id text primary key, label text not null, sort integer not null default 0
);

create table if not exists public.cases (
  id            text primary key,                       -- slug, e.g. 'airway-management'
  number        integer not null,
  title         text not null,
  category      text not null references public.categories(id),
  difficulty    text not null check (difficulty in ('BEGINNER','INTERMEDIATE','ADVANCED')),
  duration_min  integer not null check (duration_min > 0),
  summary       text,
  scenario      text,
  objectives    jsonb not null default '[]',
  patient       jsonb not null,
  vitals        jsonb not null default '{}',
  history       jsonb not null default '[]',
  "references"  jsonb not null default '[]',            -- optional source/reference field
  scoring       jsonb,                                  -- optional {"weights": {...}}
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.case_steps (
  id              uuid primary key default gen_random_uuid(),
  case_id         text not null references public.cases(id) on delete cascade,
  step_key        text not null,                        -- e.g. 's1', 'r1'
  position        integer not null,
  type            text not null check (type in ('mcq','sequence','equipment','find-error','branching')),
  title           text,
  situation       text,
  prompt          text not null,
  tag             text not null,
  critical        boolean not null default false,
  remedial        boolean not null default false,
  vitals          jsonb,
  reveal_history  jsonb,
  explanation     text not null,
  takeaway        text not null,
  unique (case_id, step_key)
);

-- One question payload per step: options / items / correct answers / instruction.
create table if not exists public.questions (
  id       uuid primary key default gen_random_uuid(),
  step_id  uuid not null references public.case_steps(id) on delete cascade,
  payload  jsonb not null,
  unique (step_id)
);

-- ------------------------------------------------------------------ user data
create table if not exists public.attempts (
  id           uuid primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  case_id      text not null,
  mode         text not null check (mode in ('practice','exam')),
  started_at   timestamptz not null,
  duration_ms  integer not null,
  final_score  integer not null check (final_score between 0 and 100),
  grade        text not null,
  breakdown    jsonb not null,
  mistakes     integer not null default 0,
  perfect      boolean not null default false,
  timed_out    boolean not null default false,
  xp_gained    integer not null default 0,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts (user_id, started_at);

create table if not exists public.attempt_answers (
  attempt_id  uuid not null references public.attempts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  step_key    text not null,
  position    integer not null,
  response    jsonb,
  score       integer not null,
  correct     boolean not null,
  time_ms     integer not null default 0,
  primary key (attempt_id, step_key)
);

create table if not exists public.progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  case_id          text not null,
  best_score       integer not null default 0,
  attempts_count   integer not null default 0,
  completed        boolean not null default false,
  last_attempt_at  timestamptz,
  primary key (user_id, case_id)
);

create table if not exists public.achievements (
  user_id      uuid not null references auth.users(id) on delete cascade,
  code         text not null,
  unlocked_at  timestamptz not null default now(),
  primary key (user_id, code)
);

-- ------------------------------------------------------------------ RLS
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.cases           enable row level security;
alter table public.case_steps      enable row level security;
alter table public.questions       enable row level security;
alter table public.attempts        enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.progress        enable row level security;
alter table public.achievements    enable row level security;

-- profiles: own row only (admins can read all)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid() and role = 'student');
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- content: everyone may read published content; only admins write
do $$
declare t text;
begin
  foreach t in array array['categories','cases','case_steps','questions'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
  end loop;
end $$;
create policy categories_read on public.categories for select using (true);
create policy cases_read      on public.cases      for select using (published or public.is_admin());
create policy case_steps_read on public.case_steps for select using (exists (select 1 from public.cases c where c.id = case_id and (c.published or public.is_admin())));
create policy questions_read  on public.questions  for select using (exists (select 1 from public.case_steps s join public.cases c on c.id = s.case_id where s.id = step_id and (c.published or public.is_admin())));
create policy categories_admin on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy cases_admin      on public.cases      for all using (public.is_admin()) with check (public.is_admin());
create policy case_steps_admin on public.case_steps for all using (public.is_admin()) with check (public.is_admin());
create policy questions_admin  on public.questions  for all using (public.is_admin()) with check (public.is_admin());

-- user data: owner only
do $$
declare t text;
begin
  foreach t in array array['attempts','attempt_answers','progress','achievements'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end $$;

-- Make yourself an admin (replace the email):
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
