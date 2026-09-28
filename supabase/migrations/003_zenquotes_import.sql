-- Daily Thought: import quotes from ZenQuotes (https://zenquotes.io) every night.
--
-- Runs entirely inside Supabase, so it needs no secret keys and works on any host:
--   1. pg_cron calls fetch_zenquotes(), which asks ZenQuotes for ~50 random quotes (pg_net).
--   2. pg_net stores the reply in net._http_response (kept for 6 hours).
--   3. Ten minutes later, pg_cron calls import_zenquotes(), which adds new quotes to
--      public.thoughts. Quotes we already have are skipped (thoughts.body is unique).
--
-- ZenQuotes' free tier requires the credit line shown on /today.
-- Safe to re-run.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- Fetch log: one row per request, so each reply is imported exactly once.
-- ---------------------------------------------------------------------------

create table if not exists public.quote_fetches (
  request_id  bigint primary key,
  requested_at timestamptz not null default now(),
  imported_at  timestamptz,
  added        integer
);

alter table public.quote_fetches enable row level security;
revoke all on public.quote_fetches from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Functions (run by pg_cron as the database owner, never by app users)
-- ---------------------------------------------------------------------------

create or replace function public.fetch_zenquotes()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  v_id := net.http_get(
    url := 'https://zenquotes.io/api/quotes',
    timeout_milliseconds := 10000
  );
  insert into public.quote_fetches (request_id) values (v_id);
  return v_id;
end;
$$;

create or replace function public.import_zenquotes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fetch record;
  v_added integer;
  v_total integer := 0;
begin
  for v_fetch in
    select f.request_id, r.content
    from public.quote_fetches f
    join net._http_response r on r.id = f.request_id
    where f.imported_at is null
      and r.status_code = 200
      and not r.timed_out
      and r.content like '[%'
  loop
    with incoming as (
      select distinct on (btrim(q ->> 'q'))
        btrim(q ->> 'q') as body,
        nullif(btrim(q ->> 'a'), '') as author
      from jsonb_array_elements(v_fetch.content::jsonb) as q
    ),
    inserted as (
      insert into public.thoughts (body, author)
      select i.body, i.author
      from incoming i
      where char_length(i.body) between 1 and 500
        -- When rate-limited, ZenQuotes replies with its own notice instead of quotes.
        and coalesce(i.author, '') <> 'zenquotes.io'
      on conflict (body) do nothing
      returning 1
    )
    select count(*) into v_added from inserted;

    update public.quote_fetches
    set imported_at = now(), added = v_added
    where request_id = v_fetch.request_id;

    v_total := v_total + v_added;
  end loop;

  return v_total;
end;
$$;

revoke all on function public.fetch_zenquotes()  from public, anon, authenticated;
revoke all on function public.import_zenquotes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Nightly schedule (UTC). 18:00 UTC is 11:30 PM in India.
-- cron.schedule with an existing job name updates that job.
-- ---------------------------------------------------------------------------

select cron.schedule('fetch-zenquotes',  '0 18 * * *',  $$select public.fetch_zenquotes()$$);
select cron.schedule('import-zenquotes', '10 18 * * *', $$select public.import_zenquotes()$$);
