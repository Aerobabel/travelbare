-- Run this in Supabase SQL Editor.
-- Shared chat history for web + mobile.

create extension if not exists pgcrypto;

create table if not exists public.chat_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  preview text not null default 'New Trip...',
  timestamp bigint not null default ((extract(epoch from now()) * 1000)::bigint),
  messages jsonb not null default '[]'::jsonb,
  custom_title boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);

create index if not exists chat_sessions_user_timestamp_idx
  on public.chat_sessions (user_id, timestamp desc);

create or replace function public.set_chat_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row
execute function public.set_chat_sessions_updated_at();

alter table public.chat_sessions enable row level security;

drop policy if exists "chat_sessions_select_own" on public.chat_sessions;
create policy "chat_sessions_select_own"
  on public.chat_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "chat_sessions_insert_own" on public.chat_sessions;
create policy "chat_sessions_insert_own"
  on public.chat_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_update_own" on public.chat_sessions;
create policy "chat_sessions_update_own"
  on public.chat_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_delete_own" on public.chat_sessions;
create policy "chat_sessions_delete_own"
  on public.chat_sessions
  for delete
  using (auth.uid() = user_id);
