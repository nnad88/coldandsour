-- Cold and Sour — run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Two tables. Both are locked to your pair code, which travels in a request header,
-- so one couple's rounds are invisible to everybody else using the same app.

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

drop policy if exists "pair only" on public.rounds;
create policy "pair only" on public.rounds
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair');

drop policy if exists "pair only" on public.ballots;
create policy "pair only" on public.ballots
  for all to anon
  using      (pair = current_setting('request.headers', true)::json ->> 'x-pair')
  with check (pair = current_setting('request.headers', true)::json ->> 'x-pair');
