-- TaskFlow public-ready schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- It creates private per-user data, guided plans, document metadata, and creator metrics.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  first_owner boolean;
begin
  select not exists (select 1 from public.profiles) into first_owner;
  insert into public.profiles (id, name, email, is_owner)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    first_owner
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  category text not null default 'General',
  due_date date,
  total_minutes integer not null default 0 check (total_minutes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  note text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.sync_task_total_minutes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_task_id uuid;
begin
  target_task_id := coalesce(new.task_id, old.task_id);
  update public.tasks
  set total_minutes = coalesce((select sum(minutes) from public.focus_sessions where task_id = target_task_id), 0)
  where id = target_task_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_task_minutes on public.focus_sessions;
create trigger sync_task_minutes
  after insert or update or delete on public.focus_sessions
  for each row execute procedure public.sync_task_total_minutes();

create table if not exists public.task_documents (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.guided_plans (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_summary text not null default '',
  current_step_number integer not null default 1 check (current_step_number > 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.guided_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.guided_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  title text not null,
  goal text not null default '',
  instructions jsonb not null default '[]'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  estimated_minutes integer,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, step_number)
);

create table if not exists public.step_checkpoints (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.guided_steps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null check (char_length(trim(note)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  guide_generations integer not null default 0,
  help_requests integer not null default 0,
  primary key (user_id, usage_date)
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id text not null check (char_length(visitor_id) between 16 and 128),
  event_type text not null default 'visit' check (event_type in ('visit', 'signup', 'first_task', 'first_focus_session')),
  created_at timestamptz not null default now()
);

-- Enable Row Level Security on every user-data table.
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.task_documents enable row level security;
alter table public.guided_plans enable row level security;
alter table public.guided_steps enable row level security;
alter table public.step_checkpoints enable row level security;
alter table public.ai_usage enable row level security;
alter table public.analytics_events enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Standard user-owned tables.
drop policy if exists "tasks_own" on public.tasks;
create policy "tasks_own" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sessions_own" on public.focus_sessions;
create policy "sessions_own" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "documents_own" on public.task_documents;
create policy "documents_own" on public.task_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "plans_own" on public.guided_plans;
create policy "plans_own" on public.guided_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "steps_own" on public.guided_steps;
create policy "steps_own" on public.guided_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "checkpoints_own" on public.step_checkpoints;
create policy "checkpoints_own" on public.step_checkpoints for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "usage_own" on public.ai_usage;
create policy "usage_own" on public.ai_usage for select using (auth.uid() = user_id);

-- Anonymous or signed-in browsers may record one privacy-safe visit event.
-- There is intentionally no SELECT policy for regular users.
drop policy if exists "analytics_insert_visit" on public.analytics_events;
create policy "analytics_insert_visit" on public.analytics_events
  for insert to anon, authenticated
  with check (event_type = 'visit' and char_length(visitor_id) between 16 and 128);

-- Private Supabase Storage bucket and policies. Safe to re-run after creating
-- the bucket in the dashboard.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-documents',
  'task-documents',
  false,
  10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "documents_upload_own_folder" on storage.objects;
create policy "documents_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_read_own_folder" on storage.objects;
create policy "documents_read_own_folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_delete_own_folder" on storage.objects;
create policy "documents_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'task-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only the first TaskFlow account can read aggregate site statistics.
create or replace function public.creator_metrics()
returns table (
  total_visits bigint,
  unique_visitors bigint,
  total_users bigint,
  total_tasks bigint,
  total_sessions bigint,
  total_focus_minutes bigint
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_owner = true) then
    raise exception 'Creator analytics are only available to the site owner';
  end if;

  return query
  select
    (select count(*) from public.analytics_events where event_type = 'visit'),
    (select count(distinct visitor_id) from public.analytics_events where event_type = 'visit'),
    (select count(*) from public.profiles),
    (select count(*) from public.tasks),
    (select count(*) from public.focus_sessions),
    coalesce((select sum(total_minutes)::bigint from public.tasks), 0);
end;
$$;

revoke all on function public.creator_metrics() from public;
grant execute on function public.creator_metrics() to authenticated;
