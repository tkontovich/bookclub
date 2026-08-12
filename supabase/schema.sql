-- Book Club Tracker schema
-- Run this once in the Supabase SQL editor for a new project
-- (Project Settings > SQL Editor > New query > paste and run).

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  picker_id uuid not null references members (id),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references rounds (id),
  title text not null,
  author text,
  cover_url text,
  description text,
  google_books_id text,
  picker_id uuid not null references members (id),
  status text not null default 'candidate'
    check (status in ('candidate', 'current', 'past', 'rejected')),
  date_discussed date,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds (id) on delete cascade,
  book_id uuid not null references books (id) on delete cascade,
  member_id uuid not null references members (id),
  created_at timestamptz not null default now(),
  unique (round_id, member_id)
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books (id) on delete cascade,
  member_id uuid not null references members (id),
  score numeric(4, 1) not null check (score >= 1 and score <= 10),
  created_at timestamptz not null default now(),
  unique (book_id, member_id)
);

-- Singleton row (id must be `true`, so only one row can ever exist).
create table if not exists club_settings (
  id boolean primary key default true check (id),
  next_meeting_date date,
  next_picker_id uuid references members (id)
);

insert into club_settings (id)
values (true)
on conflict (id) do nothing;

create index if not exists books_status_idx on books (status);
create index if not exists books_round_id_idx on books (round_id);
create index if not exists votes_round_id_idx on votes (round_id);
create index if not exists scores_book_id_idx on scores (book_id);

-- This app connects with the Supabase service role key from trusted server
-- code only (never from the browser), so Row Level Security is left off.
-- If you ever add a client-side Supabase connection, enable RLS on every
-- table above first.
