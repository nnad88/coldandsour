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

-- IMPORTANT, two ways this silently does nothing:
--   1. The SQL editor runs only the SELECTED text when there is a selection.
--      Click once in the editor and press Run with nothing highlighted.
--   2. Run it on the project the app actually talks to. The connection test in
--      the app's settings prints that project's URL.
-- The last statement below prints what the database ended up with, so you can
-- see it worked instead of hoping.

-- PostgREST serves the API from a cached copy of the schema, and adding columns
-- does not always make it look again — the API then answers PGRST204, "could not
-- find the 'state' column", about a column that plainly exists. This tells it to
-- read the schema afresh, and is why this file is safe and useful to re-run.
notify pgrst, 'reload schema';

-- ---- proof --------------------------------------------------------------
-- After Run, the results pane should show "ready" twice. Anything else means
-- the statements above did not take effect on this project.
select t.table_name,
       case when count(*) filter (where c.column_name = 'room') = 1
             and count(*) filter (where c.column_name in ('sections','state','name')) >= 1
            then 'ready' else 'MISSING COLUMNS' end as status,
       string_agg(c.column_name, ', ' order by c.column_name) as columns
from (values ('rounds'), ('ballots')) as t(table_name)
left join information_schema.columns c
       on c.table_schema = 'public' and c.table_name = t.table_name
group by t.table_name;
