-- Fix: in get_daily_thought, `on conflict (user_id, day)` was ambiguous because
-- `day` is also an output column of the function (RETURNS TABLE). Target the
-- primary-key constraint by name instead.

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
    on conflict on constraint daily_thoughts_pkey do nothing;
  end if;

  return query
    select d.day, d.thought_id, t.body, t.author, d.reflection, d.completed_at
    from public.daily_thoughts d
    join public.thoughts t on t.id = d.thought_id
    where d.user_id = v_uid and d.day = v_day;
end;
$$;
