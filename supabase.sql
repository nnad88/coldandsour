-- Cold and Sour — run this once, in Supabase: SQL Editor -> New query -> Run.
-- Safe to run again at any time; it only creates what is missing.
--
-- These two tables are all the app has ever needed, and all it needs now.
-- Group rounds — the join code, the chosen courses, who is at the table —
-- travel inside the jsonb columns below, so the app gaining features never
-- means a migration, and there is nothing here to get wrong.
--
-- Two ways running this can silently do nothing:
--   1. The SQL editor runs only the SELECTED text when something is
--      highlighted. Click once in the editor, select nothing, press Run.
--   2. It has to be the project the app talks to. The connection test in the
--      app's settings prints that project's URL.
-- The last statement prints what the database ended up with, so you can see
-- that it worked rather than hope.

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

create index if not exists rounds_pair_created_idx on public.rounds (pair, created_at desc);

alter table public.rounds  enable row level security;
alter table public.ballots enable row level security;

-- Every request carries your pair code in a header. You see your own rounds
-- and nobody else's; a guest is handed that code by the QR at the table.
drop policy if exists "pair only"    on public.rounds;
drop policy if exists "pair or room" on public.rounds;
create policy "pair only" on public.rounds
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair');

drop policy if exists "pair only"    on public.ballots;
drop policy if exists "pair or room" on public.ballots;
create policy "pair only" on public.ballots
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair');

-- PostgREST answers from a cached copy of the schema and does not always
-- notice changes on its own. This tells it to look again.
notify pgrst, 'reload schema';

-- ---- proof ---------------------------------------------------------------
-- The results pane should show "ready" on both rows. Anything else means the
-- statements above did not take effect on this project.
select t.table_name,
       case when count(c.column_name) >= 6 then 'ready' else 'NOT SET UP' end as status,
       coalesce(string_agg(c.column_name, ', ' order by c.column_name), '(no table)') as columns
from (values ('rounds'), ('ballots')) as t(table_name)
left join information_schema.columns c
       on c.table_schema = 'public' and c.table_name = t.table_name
group by t.table_name;
