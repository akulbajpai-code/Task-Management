-- Run this in Supabase SQL Editor after the original schema.sql.
-- It adds persistent direct-message history for each Guided Mode step.

create table if not exists public.step_messages (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.guided_steps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 6000),
  created_at timestamptz not null default now()
);

alter table public.step_messages enable row level security;

drop policy if exists "messages_own" on public.step_messages;
create policy "messages_own" on public.step_messages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
