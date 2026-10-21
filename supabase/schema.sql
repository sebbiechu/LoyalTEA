-- LoyalTEA v2 schema: anonymous stamp cards.
-- Holds NO personal data. A card is a random code generated on the colleague's phone.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

-- Old v1 tables (stored names + PINs). Remove them.
drop table if exists stamps cascade;
drop table if exists drink_types cascade;
drop table if exists users cascade;

create table if not exists cards (
  code          text primary key check (code ~ '^[0-9A-HJKMNP-TV-Z]{12}$'),
  created_at    timestamptz not null default now(),
  last_activity timestamptz not null default now()
);

create table if not exists card_events (
  id         bigint generated always as identity primary key,
  card_code  text not null references cards(code) on delete cascade,
  kind       text not null check (kind in ('stamp', 'redeem')),
  drink      text,
  created_at timestamptz not null default now()
);
create index if not exists card_events_card_idx on card_events (card_code, created_at desc);
create index if not exists card_events_time_idx on card_events (created_at);

-- Failed staff PIN attempts (no IPs, no identifiers; just timestamps) for lockout.
create table if not exists pin_failures (
  id bigint generated always as identity primary key,
  at timestamptz not null default now()
);

-- Lock everything down. The app talks to the database only from the server
-- with the service role key; the public/anon key gets no access at all.
alter table cards        enable row level security;
alter table card_events  enable row level security;
alter table pin_failures enable row level security;
revoke all on cards, card_events, pin_failures from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Card state helper
-- ---------------------------------------------------------------------------
create or replace function card_state(p_code text, p_target int)
returns json language sql stable as $$
  select json_build_object(
    'code', p_code,
    'exists', exists (select 1 from cards where code = p_code),
    'balance', coalesce(sum(case when kind = 'stamp' then 1 else -p_target end), 0),
    'total_stamps', count(*) filter (where kind = 'stamp'),
    'total_redeemed', count(*) filter (where kind = 'redeem'),
    'last_event_at', max(created_at)
  )
  from card_events where card_code = p_code;
$$;

-- ---------------------------------------------------------------------------
-- Add a stamp (creates the card on its first stamp)
-- ---------------------------------------------------------------------------
create or replace function add_stamp(p_code text, p_drink text, p_target int)
returns json language plpgsql as $$
begin
  insert into cards (code) values (p_code)
    on conflict (code) do update set last_activity = now();
  perform 1 from cards where code = p_code for update;   -- serialise taps on one card
  insert into card_events (card_code, kind, drink) values (p_code, 'stamp', p_drink);
  return card_state(p_code, p_target);
end $$;

-- ---------------------------------------------------------------------------
-- Redeem a free drink (fails if the card doesn't have enough stamps)
-- ---------------------------------------------------------------------------
create or replace function redeem_reward(p_code text, p_drink text, p_target int)
returns json language plpgsql as $$
declare v_balance int;
begin
  perform 1 from cards where code = p_code for update;
  if not found then raise exception 'NOT_ENOUGH_STAMPS'; end if;
  select coalesce(sum(case when kind = 'stamp' then 1 else -p_target end), 0)
    into v_balance from card_events where card_code = p_code;
  if v_balance < p_target then raise exception 'NOT_ENOUGH_STAMPS'; end if;
  insert into card_events (card_code, kind, drink) values (p_code, 'redeem', p_drink);
  update cards set last_activity = now() where code = p_code;
  return card_state(p_code, p_target);
end $$;

-- ---------------------------------------------------------------------------
-- Undo the most recent action on a card, if it was in the last 10 minutes
-- ---------------------------------------------------------------------------
create or replace function undo_last(p_code text, p_target int)
returns json language plpgsql as $$
declare v_id bigint;
begin
  perform 1 from cards where code = p_code for update;
  select id into v_id from card_events
    where card_code = p_code and created_at > now() - interval '10 minutes'
    order by created_at desc, id desc limit 1;
  if v_id is null then raise exception 'NOTHING_TO_UNDO'; end if;
  delete from card_events where id = v_id;
  return card_state(p_code, p_target);
end $$;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create or replace function report_summary(p_days int, p_tz text default 'Europe/London')
returns json language sql stable as $$
  with ev as (
    select * from card_events
    where created_at >= date_trunc('day', now() at time zone p_tz) at time zone p_tz
                        - make_interval(days => p_days - 1)
  ),
  days as (
    select generate_series(
      (now() at time zone p_tz)::date - (p_days - 1),
      (now() at time zone p_tz)::date, interval '1 day')::date as d
  )
  select json_build_object(
    'stamps',       (select count(*) from ev where kind = 'stamp'),
    'redemptions',  (select count(*) from ev where kind = 'redeem'),
    'active_cards', (select count(distinct card_code) from ev),
    'new_cards',    (select count(*) from cards
                      where created_at >= (select min(d) from days)::timestamp at time zone p_tz),
    'total_cards',  (select count(*) from cards),
    'daily', (select coalesce(json_agg(json_build_object(
                 'day', days.d,
                 'stamps', (select count(*) from ev where kind = 'stamp' and (created_at at time zone p_tz)::date = days.d),
                 'redemptions', (select count(*) from ev where kind = 'redeem' and (created_at at time zone p_tz)::date = days.d)
               ) order by days.d), '[]') from days),
    'drinks', (select coalesce(json_agg(x order by x.count desc), '[]') from (
                 select coalesce(drink, 'Other') as drink, count(*) as count
                 from ev where kind = 'stamp' group by 1) x),
    'hours',  (select coalesce(json_agg(x order by x.hour), '[]') from (
                 select extract(hour from created_at at time zone p_tz)::int as hour, count(*) as count
                 from ev group by 1) x)
  );
$$;

-- Only the server (service role) may call these.
revoke execute on function card_state(text, int), add_stamp(text, text, int),
  redeem_reward(text, text, int), undo_last(text, int), report_summary(int, text)
  from public, anon, authenticated;
