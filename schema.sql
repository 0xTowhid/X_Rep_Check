-- ============================================================
-- Session Proof Checker — Supabase Schema
-- Paste this entire file into your Supabase SQL Editor and run it
-- ============================================================

-- Sessions table
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Partial unique index: only one session can be active at a time
create unique index if not exists sessions_one_active
  on public.sessions (is_active)
  where (is_active = true);

-- Session tweets table
create table if not exists public.session_tweets (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  tweet_url   text not null,
  tweet_id    text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_session_tweets_session
  on public.session_tweets(session_id);

-- Check results table
create table if not exists public.check_results (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.sessions(id) on delete cascade,
  username         text not null,
  completed_count  integer not null default 0,
  total_count      integer not null default 0,
  completion_rate  numeric(5,1) not null default 0,
  tweet_results    jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);

-- Unique: one result per user per session (used for upsert)
create unique index if not exists idx_check_results_session_user
  on public.check_results (session_id, username);

create index if not exists idx_check_results_session
  on public.check_results(session_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.sessions       enable row level security;
alter table public.session_tweets  enable row level security;
alter table public.check_results   enable row level security;

-- Everyone can read sessions and tweets (needed by user portal)
create policy "Public can read sessions"
  on public.sessions for select using (true);

create policy "Public can read session_tweets"
  on public.session_tweets for select using (true);

-- Anyone can read and upsert their own check result
create policy "Public can read check_results"
  on public.check_results for select using (true);

create policy "Public can upsert check_results"
  on public.check_results for insert with check (true);

create policy "Public can update check_results"
  on public.check_results for update using (true);

-- Only authenticated users (admins) can modify sessions/tweets
create policy "Auth users can manage sessions"
  on public.sessions for all using (auth.role() = 'authenticated');

create policy "Auth users can manage session_tweets"
  on public.session_tweets for all using (auth.role() = 'authenticated');

-- ============================================================
-- Auto-update updated_at on sessions
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();
