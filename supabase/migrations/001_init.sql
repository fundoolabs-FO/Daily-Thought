-- Daily Thought: initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`) for BOTH the dev and prod projects.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.thoughts (
  id         bigint generated always as identity primary key,
  body       text    not null unique check (char_length(body) between 1 and 500),
  author     text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_thoughts (
  user_id      uuid   not null references auth.users (id) on delete cascade,
  day          date   not null,
  thought_id   bigint not null references public.thoughts (id) on delete restrict,
  reflection   text   check (
                 reflection is null
                 or (char_length(reflection) <= 280 and reflection !~ '[\r\n]')
               ),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists daily_thoughts_user_thought_idx
  on public.daily_thoughts (user_id, thought_id, day desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.thoughts       enable row level security;
alter table public.daily_thoughts enable row level security;

-- Signed-in users can read the thought catalogue (needed to show past days).
drop policy if exists "thoughts are readable by signed-in users" on public.thoughts;
create policy "thoughts are readable by signed-in users"
  on public.thoughts for select
  to authenticated
  using (true);

-- Users can only see their own daily rows.
drop policy if exists "users read own daily thoughts" on public.daily_thoughts;
create policy "users read own daily thoughts"
  on public.daily_thoughts for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users can only update their own daily rows (column grants below limit WHICH columns).
drop policy if exists "users update own daily thoughts" on public.daily_thoughts;
create policy "users update own daily thoughts"
  on public.daily_thoughts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No insert/delete policies: rows are created only by get_daily_thought().

-- ---------------------------------------------------------------------------
-- Privileges: be explicit rather than relying on project defaults
-- ---------------------------------------------------------------------------

revoke all on public.thoughts       from anon, authenticated;
revoke all on public.daily_thoughts from anon, authenticated;

grant select on public.thoughts to authenticated;
grant select on public.daily_thoughts to authenticated;
grant update (reflection, completed_at) on public.daily_thoughts to authenticated;

-- ---------------------------------------------------------------------------
-- Guard: only today's row (with a one-day timezone allowance) can be changed,
-- so a streak can't be back-filled through the API.
-- ---------------------------------------------------------------------------

create or replace function public.daily_thoughts_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.day < (now() at time zone 'UTC')::date - 1 then
    raise exception 'past days can no longer be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_thoughts_guard_update on public.daily_thoughts;
create trigger daily_thoughts_guard_update
  before update on public.daily_thoughts
  for each row execute function public.daily_thoughts_guard_update();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The current calendar date in an IANA timezone; falls back to UTC for bad input.
create or replace function public.local_today(p_tz text)
returns date
language plpgsql
stable
set search_path = ''
as $$
begin
  return (now() at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date;
exception when others then
  return (now() at time zone 'UTC')::date;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_daily_thought(p_tz): assigns (once) and returns the caller's thought for
-- their local "today". Stable across refreshes and devices thanks to the
-- (user_id, day) primary key; avoids thoughts seen in the previous 60 days.
-- ---------------------------------------------------------------------------

create or replace function public.get_daily_thought(p_tz text default 'UTC')
returns table (
  day          date,
  thought_id   bigint,
  body         text,
  author       text,
  reflection   text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_day     date;
  v_thought bigint;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  v_day := public.local_today(p_tz);

  if not exists (
    select 1 from public.daily_thoughts d where d.user_id = v_uid and d.day = v_day
  ) then
    -- Random active thought not shown in the last 60 days.
    select t.id into v_thought
    from public.thoughts t
    where t.active
      and not exists (
        select 1 from public.daily_thoughts d
        where d.user_id = v_uid
          and d.thought_id = t.id
          and d.day >= v_day - 60
      )
    order by random()
    limit 1;

    -- Everything was used recently: take the least recently seen one.
    if v_thought is null then
      select t.id into v_thought
      from public.thoughts t
      left join (
        select d.thought_id, max(d.day) as last_day
        from public.daily_thoughts d
        where d.user_id = v_uid
        group by d.thought_id
      ) seen on seen.thought_id = t.id
      where t.active
      order by seen.last_day nulls first, random()
      limit 1;
    end if;

    if v_thought is null then
      raise exception 'no active thoughts available';
    end if;

    -- A concurrent request may have won the race; the primary key keeps one row.
    insert into public.daily_thoughts (user_id, day, thought_id)
    values (v_uid, v_day, v_thought)
    on conflict (user_id, day) do nothing;
  end if;

  return query
    select d.day, d.thought_id, t.body, t.author, d.reflection, d.completed_at
    from public.daily_thoughts d
    join public.thoughts t on t.id = d.thought_id
    where d.user_id = v_uid and d.day = v_day;
end;
$$;

-- Current streak of consecutive completed days. Today not being done yet does
-- not break the streak; it counts back from yesterday in that case.
create or replace function public.get_streak(p_tz text default 'UTC')
returns integer
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := public.local_today(p_tz);
  v_streak integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  if not exists (
    select 1 from public.daily_thoughts d
    where d.user_id = v_uid and d.day = v_day and d.completed_at is not null
  ) then
    v_day := v_day - 1;
  end if;

  while exists (
    select 1 from public.daily_thoughts d
    where d.user_id = v_uid and d.day = v_day and d.completed_at is not null
  ) loop
    v_streak := v_streak + 1;
    v_day := v_day - 1;
  end loop;

  return v_streak;
end;
$$;

revoke all on function public.local_today(text)        from public, anon;
revoke all on function public.get_daily_thought(text)  from public, anon;
revoke all on function public.get_streak(text)         from public, anon;
revoke all on function public.daily_thoughts_guard_update() from public, anon, authenticated;

grant execute on function public.local_today(text)       to authenticated;
grant execute on function public.get_daily_thought(text) to authenticated;
grant execute on function public.get_streak(text)        to authenticated;
