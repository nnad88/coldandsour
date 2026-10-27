-- Cold and Sour — run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again over an older install: it only adds what is missing.
--
-- Two tables. A round belongs to the phone that scanned the menu (its "pair"),
-- and carries a short join code (its "room") that guests are given by QR. Row
-- security lets you through on either one, so the host sees all their own
-- rounds and a guest sees exactly the one they were invited to.

create table if not exists public.rounds (
  id         text primary key,
  pair       text not null,
  place      text,
  dishes     jsonb not null,
  shot_by    text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ballots (
  round_id   text not null,
  pair       text not null,
  voter      text not null,
  votes      jsonb not null default '{}'::jsonb,
  done       boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (round_id, voter)
);

-- ---- added for group rounds -------------------------------------------------
alter table public.rounds  add column if not exists room      text;
alter table public.rounds  add column if not exists sections  jsonb;   -- courses chosen
alter table public.rounds  add column if not exists host_name text;
alter table public.rounds  add column if not exists state     text not null default 'open';

alter table public.ballots add column if not exists room  text;
alter table public.ballots add column if not exists name  text;
alter table public.ballots add column if not exists seen  timestamptz;

create index if not exists rounds_pair_created_idx on public.rounds (pair, created_at desc);
create index if not exists rounds_room_idx         on public.rounds (room);
create index if not exists ballots_room_idx        on public.ballots (room);

alter table public.rounds  enable row level security;
alter table public.ballots enable row level security;

-- The header carries either the host's own pair code or a round's join code.
drop policy if exists "pair only" on public.rounds;
drop policy if exists "pair or room" on public.rounds;
create policy "pair or room" on public.rounds
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair'
           or room = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair'
           or room = current_setting('request.headers', true)::json ->> 'x-pair');

drop policy if exists "pair only" on public.ballots;
drop policy if exists "pair or room" on public.ballots;
create policy "pair or room" on public.ballots
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair'
           or room = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair'
           or room = current_setting('request.headers', true)::json ->> 'x-pair');

-- PostgREST serves the API from a cached copy of the schema, and adding columns
-- does not always make it look again — the API then answers PGRST204, "could not
-- find the 'state' column", about a column that plainly exists. This tells it to
-- read the schema afresh, and is why this file is safe and useful to re-run.
notify pgrst, 'reload schema';
