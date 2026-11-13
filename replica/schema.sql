-- Padel & Piwo: schema for Supabase (Postgres 15+).
-- Signup is open. Access rules: row level security on every table. Clients
-- read through RLS and write only through the security definer functions
-- below, except for the few direct writes listed in the policies.
-- All times are timestamptz (UTC). The app shows them in Europe/Warsaw.

-- ---------------------------------------------------------------- helpers

create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------- tables

create table profiles (
  id uuid primary key default gen_random_uuid(),
  -- set null, not cascade: deleting the login keeps the anonymised player so
  -- old match history stays consistent for the other players
  auth_id uuid unique references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  city text,
  hand text check (hand in ('right', 'left')),
  court_side text check (court_side in ('left', 'right', 'both')),
  level numeric(4,2) not null default 4.00 check (level between 1 and 10),
  reliability numeric(3,2) not null default 0 check (reliability between 0 and 1),
  locale text not null default 'es' check (locale in ('es', 'en')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles (display_name);
create trigger profiles_updated before update on profiles
  for each row execute function set_updated_at();

create function me() returns uuid language sql stable security definer
set search_path = public as $$
  select id from profiles where auth_id = auth.uid()
$$;

-- Tournaments are player-run, single elimination, played in pairs.
-- max_pairs 4, 8 or 16 means 8, 16 or 32 players.
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references profiles(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  place text not null check (char_length(place) between 2 and 120),
  starts_at timestamptz not null,
  max_pairs smallint not null check (max_pairs in (4, 8, 16)),
  round_days smallint not null default 7 check (round_days between 1 and 30),
  status text not null default 'registration'
    check (status in ('registration', 'in_progress', 'finished', 'cancelled')),
  champion_pair_id uuid,   -- foreign key added after tournament_pairs exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint champion_only_when_finished check (champion_pair_id is null or status = 'finished')
);
create index on tournaments (status, starts_at);
create index on tournaments (organizer_id);
create trigger tournaments_updated before update on tournaments
  for each row execute function set_updated_at();

create table matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete restrict,  -- the organizer, for tournament matches
  starts_at timestamptz not null,
  duration_minutes smallint not null default 90 check (duration_minutes between 30 and 240),
  place text not null check (char_length(place) between 2 and 120),
  type text not null default 'friendly' check (type in ('friendly', 'competitive')),
  level_min numeric(4,2) not null default 1,
  level_max numeric(4,2) not null default 10,
  notes text check (char_length(notes) <= 500),
  status text not null default 'open'
    check (status in ('open', 'full', 'played', 'cancelled')),
  tournament_id uuid references tournaments(id) on delete restrict,
  result_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint level_range check (
    level_min between 1 and 10 and level_max between 1 and 10 and level_max >= level_min)
);
create index on matches (status, starts_at);
create index on matches (host_id);
create index on matches (tournament_id);
create trigger matches_updated before update on matches
  for each row execute function set_updated_at();

-- team is derived from the slot: slots 1-2 are team A, slots 3-4 team B
create table match_players (
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references profiles(id) on delete restrict,
  slot smallint check (slot between 1 and 4),
  team text generated always as (
    case when slot is null then null when slot <= 2 then 'A' else 'B' end) stored,
  status text not null default 'joined' check (status in ('joined', 'requested', 'left')),
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id),
  constraint slot_iff_joined check ((status = 'joined') = (slot is not null))
);
-- the database, not the UI, guarantees two players never take the same slot
create unique index match_players_slot_uq on match_players (match_id, slot)
  where status = 'joined';
create index on match_players (player_id);

create table match_results (
  match_id uuid primary key references matches(id) on delete cascade,
  submitted_by uuid not null references profiles(id) on delete restrict,
  winner_team text not null check (winner_team in ('A', 'B')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disputed')),
  confirmed_by uuid references profiles(id) on delete restrict,
  followup_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on match_results (submitted_by);
create index on match_results (confirmed_by);
create trigger match_results_updated before update on match_results
  for each row execute function set_updated_at();

create table set_scores (
  match_id uuid not null references matches(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 3),
  team_a_games smallint not null check (team_a_games between 0 and 20),
  team_b_games smallint not null check (team_b_games between 0 and 20),
  primary key (match_id, set_number),
  check (team_a_games <> team_b_games)
);

create table rating_changes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete restrict,
  match_id uuid not null references matches(id) on delete cascade,
  old_level numeric(4,2) not null,
  new_level numeric(4,2) not null,
  created_at timestamptz not null default now(),
  unique (player_id, match_id)
);
create index on rating_changes (player_id, created_at desc);
create index on rating_changes (match_id);

create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followed_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index on follows (followed_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'player_joined', 'join_requested', 'request_accepted', 'match_cancelled',
    'result_submitted', 'result_confirmed', 'result_disputed', 'result_reminder',
    'tournament_pair_invite', 'tournament_pair_accepted', 'tournament_pair_withdrawn',
    'tournament_started', 'tournament_match_ready', 'tournament_cancelled',
    'tournament_finished', 'tournament_organizer_assigned')),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (player_id, created_at desc);

create table push_tokens (
  token text primary key,
  player_id uuid not null references profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);
create index on push_tokens (player_id);

-- A pair is the registrant (player1) plus the partner they name (player2).
-- It is pending until the partner accepts; only confirmed pairs fill the cap.
create table tournament_pairs (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player1_id uuid not null references profiles(id) on delete restrict,
  player2_id uuid not null references profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'withdrawn')),
  seed smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player1_id <> player2_id)
);
-- one live pair per player per tournament (the cross-column case, player1 of
-- one pair being player2 of another, is checked in register_pair under a lock)
create unique index tournament_pairs_p1_uq on tournament_pairs (tournament_id, player1_id)
  where status <> 'withdrawn';
create unique index tournament_pairs_p2_uq on tournament_pairs (tournament_id, player2_id)
  where status <> 'withdrawn';
create index on tournament_pairs (player1_id);
create index on tournament_pairs (player2_id);
create trigger tournament_pairs_updated before update on tournament_pairs
  for each row execute function set_updated_at();

-- every tie of the bracket is created at the draw; later rounds fill as winners advance
create table tournament_ties (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_no smallint not null check (round_no between 1 and 4),
  pos smallint not null check (pos >= 1),
  pair_a_id uuid references tournament_pairs(id) on delete restrict,
  pair_b_id uuid references tournament_pairs(id) on delete restrict,
  match_id uuid unique references matches(id) on delete restrict,
  winner_pair_id uuid references tournament_pairs(id) on delete restrict,
  unique (tournament_id, round_no, pos)
);
create index on tournament_ties (pair_a_id);
create index on tournament_ties (pair_b_id);
create index on tournament_ties (winner_pair_id);

alter table tournaments add constraint tournaments_champion_fk
  foreign key (champion_pair_id) references tournament_pairs(id) on delete restrict;
create index on tournaments (champion_pair_id);

-- ---------------------------------------------------------------- signup

-- Creates the profile on signup. Signup is open.
create function handle_new_user() returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_name text := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
                               split_part(new.email, '@', 1), 'Player'), 40);
  v_locale text := case when new.raw_user_meta_data->>'locale' = 'en' then 'en' else 'es' end;
begin
  insert into profiles (auth_id, display_name, locale)
    values (new.id, coalesce(nullif(v_name, ''), 'Player'), v_locale);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- the host takes slot 1 of their own match (tournament matches fill their own slots)
create function host_joins_match() returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.tournament_id is null then
    insert into match_players (match_id, player_id, slot, status)
      values (new.id, new.host_id, 1, 'joined');
  end if;
  return new;
end $$;

create trigger matches_host_joins after insert on matches
  for each row execute function host_joins_match();

-- ---------------------------------------------------------------- internal

create function notify(p_player uuid, p_type text, p_payload jsonb) returns void
language sql security definer set search_path = public as $$
  insert into notifications (player_id, type, payload) values (p_player, p_type, p_payload)
$$;

create function free_slot(p_match uuid) returns smallint
language sql stable security definer set search_path = public as $$
  select s::smallint from generate_series(1, 4) s
  where not exists (select 1 from match_players
                    where match_id = p_match and slot = s and status = 'joined')
  order by s limit 1
$$;

-- Elo-style rating on our own 1 to 10 scale (not Playtomic's algorithm).
-- A 2-level gap between team averages gives the stronger team a 91% expected
-- win. K shrinks as a player's reliability grows.
create function apply_ratings(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_avg_a numeric; v_avg_b numeric; v_win_a numeric; v_exp_a numeric;
  r record; v_delta numeric; v_new numeric;
begin
  select avg(p.level) into v_avg_a from match_players mp
    join profiles p on p.id = mp.player_id
    where mp.match_id = p_match and mp.status = 'joined' and mp.team = 'A';
  select avg(p.level) into v_avg_b from match_players mp
    join profiles p on p.id = mp.player_id
    where mp.match_id = p_match and mp.status = 'joined' and mp.team = 'B';
  select (winner_team = 'A')::int into v_win_a from match_results where match_id = p_match;
  v_exp_a := 1 / (1 + power(10, (v_avg_b - v_avg_a) / 2.0));

  for r in
    select mp.player_id, mp.team, p.level, p.reliability
    from match_players mp join profiles p on p.id = mp.player_id
    where mp.match_id = p_match and mp.status = 'joined'
  loop
    v_delta := 0.15 * (1.5 - r.reliability) *
      case when r.team = 'A' then v_win_a - v_exp_a else v_exp_a - v_win_a end;
    v_new := least(10, greatest(1, round(r.level + v_delta, 2)));
    insert into rating_changes (player_id, match_id, old_level, new_level)
      values (r.player_id, p_match, r.level, v_new);
    update profiles set level = v_new, reliability = least(1, reliability + 0.05)
      where id = r.player_id;
  end loop;
end $$;

-- Validates and stores the sets of a match, replacing any earlier ones and any
-- earlier result row. Returns the winning team. The caller inserts the result.
-- p_sets example: [{"a":6,"b":4},{"a":3,"b":6},{"a":10,"b":8}]
create function save_sets(p_match uuid, p_sets jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_a int := 0; v_b int := 0; v_i int := 0; s jsonb;
begin
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) not between 1 and 3 then
    raise exception 'invalid_sets';
  end if;
  delete from set_scores where match_id = p_match;
  delete from match_results where match_id = p_match;
  for s in select value from jsonb_array_elements(p_sets) loop
    v_i := v_i + 1;
    insert into set_scores (match_id, set_number, team_a_games, team_b_games)
      values (p_match, v_i, (s->>'a')::smallint, (s->>'b')::smallint);
    if (s->>'a')::int > (s->>'b')::int then v_a := v_a + 1; else v_b := v_b + 1; end if;
  end loop;
  if v_a = v_b then raise exception 'invalid_sets'; end if;
  return case when v_a > v_b then 'A' else 'B' end;
end $$;

-- Confirms a pending or organizer-set result, applies ratings for competitive
-- matches and moves a tournament forward. Shared by confirm_result and
-- organizer_set_result.
create function finalize_result(p_match uuid, p_confirmer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_type text; v_tid uuid;
begin
  update match_results set status = 'confirmed', confirmed_by = p_confirmer
    where match_id = p_match;
  update matches set status = 'played' where id = p_match
    returning type, tournament_id into v_type, v_tid;
  if v_type = 'competitive' then perform apply_ratings(p_match); end if;
  if v_tid is not null then perform advance_tournament(p_match); end if;
end $$;

-- Creates the real match for one tie once both pairs are known.
-- Pair A takes slots 1-2 (team A), pair B slots 3-4 (team B).
create function create_tie_match(p_tie uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tie tournament_ties; v_t tournaments; v_a tournament_pairs; v_b tournament_pairs;
  v_match uuid; v_start timestamptz;
begin
  select * into v_tie from tournament_ties where id = p_tie;
  select * into v_t from tournaments where id = v_tie.tournament_id;
  select * into v_a from tournament_pairs where id = v_tie.pair_a_id;
  select * into v_b from tournament_pairs where id = v_tie.pair_b_id;
  -- round 1 never starts before the tournament date; later rounds get round_days
  -- to be played. The pairs can move the date with reschedule_match.
  v_start := case when v_tie.round_no = 1
                  then greatest(v_t.starts_at, now() + interval '1 day')
                  else now() + make_interval(days => v_t.round_days) end;
  insert into matches (host_id, starts_at, place, type, status, tournament_id, notes)
    values (v_t.organizer_id, v_start, v_t.place, 'competitive', 'full', v_t.id, v_t.name)
    returning id into v_match;
  insert into match_players (match_id, player_id, slot, status) values
    (v_match, v_a.player1_id, 1, 'joined'), (v_match, v_a.player2_id, 2, 'joined'),
    (v_match, v_b.player1_id, 3, 'joined'), (v_match, v_b.player2_id, 4, 'joined');
  update tournament_ties set match_id = v_match where id = p_tie;
  insert into notifications (player_id, type, payload)
    select unnest(array[v_a.player1_id, v_a.player2_id, v_b.player1_id, v_b.player2_id]),
           'tournament_match_ready',
           jsonb_build_object('tournament_id', v_t.id, 'match_id', v_match);
end $$;

-- The caller holds the tournament row lock. Random seeds, the whole bracket
-- up front, and the first round's matches.
create function draw_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_t tournaments; v_rounds int; v_r int; v_i int; rec record;
begin
  select * into v_t from tournaments where id = p_tournament;
  -- invites still pending when the cap fills expire
  update tournament_pairs set status = 'withdrawn'
    where tournament_id = p_tournament and status = 'pending';
  update tournament_pairs tp set seed = x.rn
    from (select id, row_number() over (order by random()) as rn
          from tournament_pairs
          where tournament_id = p_tournament and status = 'confirmed') x
    where tp.id = x.id;

  v_rounds := case v_t.max_pairs when 4 then 2 when 8 then 3 else 4 end;
  for v_r in 1..v_rounds loop
    for v_i in 1..(v_t.max_pairs::int >> v_r) loop
      insert into tournament_ties (tournament_id, round_no, pos) values (p_tournament, v_r, v_i);
    end loop;
  end loop;

  update tournament_ties t set pair_a_id = a.id, pair_b_id = b.id
    from tournament_pairs a, tournament_pairs b
    where t.tournament_id = p_tournament and t.round_no = 1
      and a.tournament_id = p_tournament and a.status = 'confirmed' and a.seed = 2 * t.pos - 1
      and b.tournament_id = p_tournament and b.status = 'confirmed' and b.seed = 2 * t.pos;

  update tournaments set status = 'in_progress' where id = p_tournament;
  insert into notifications (player_id, type, payload)
    select unnest(array[player1_id, player2_id]), 'tournament_started',
           jsonb_build_object('tournament_id', p_tournament)
    from tournament_pairs where tournament_id = p_tournament and status = 'confirmed';

  for rec in select id from tournament_ties
             where tournament_id = p_tournament and round_no = 1 order by pos
  loop
    perform create_tie_match(rec.id);
  end loop;
end $$;

-- Called when a tournament match is confirmed: the winner moves to the next
-- tie, or becomes champion after the final.
create function advance_tournament(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tie tournament_ties; v_t tournaments; v_next tournament_ties;
  v_team text; v_winner uuid; v_rounds int; v_w tournament_pairs;
begin
  select * into v_tie from tournament_ties where match_id = p_match for update;
  if not found then return; end if;
  select winner_team into v_team from match_results where match_id = p_match;
  v_winner := case when v_team = 'A' then v_tie.pair_a_id else v_tie.pair_b_id end;
  update tournament_ties set winner_pair_id = v_winner where id = v_tie.id;

  select * into v_t from tournaments where id = v_tie.tournament_id;
  v_rounds := case v_t.max_pairs when 4 then 2 when 8 then 3 else 4 end;

  if v_tie.round_no = v_rounds then
    update tournaments set status = 'finished', champion_pair_id = v_winner where id = v_t.id;
    select * into v_w from tournament_pairs where id = v_winner;
    insert into notifications (player_id, type, payload)
      select unnest(array[v_w.player1_id, v_w.player2_id]), 'tournament_finished',
             jsonb_build_object('tournament_id', v_t.id);
    return;
  end if;

  select * into v_next from tournament_ties
    where tournament_id = v_t.id and round_no = v_tie.round_no + 1
      and pos = (v_tie.pos + 1) / 2
    for update;
  if v_tie.pos % 2 = 1 then
    update tournament_ties set pair_a_id = v_winner where id = v_next.id;
  else
    update tournament_ties set pair_b_id = v_winner where id = v_next.id;
  end if;
  select * into v_next from tournament_ties where id = v_next.id;
  if v_next.pair_a_id is not null and v_next.pair_b_id is not null then
    perform create_tie_match(v_next.id);
  end if;
end $$;

-- ---------------------------------------------------------------- RPC: matches

create function join_match(p_match uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_m matches; v_lvl numeric; v_slot smallint;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_m from matches where id = p_match for update;  -- serialises racers
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is not null then raise exception 'tournament_match'; end if;
  if v_m.status <> 'open' or v_m.starts_at <= now() then raise exception 'match_not_open'; end if;
  if exists (select 1 from match_players
             where match_id = p_match and player_id = v_me and status = 'joined') then
    raise exception 'already_joined';
  end if;

  select level into v_lvl from profiles where id = v_me;
  if v_lvl < v_m.level_min or v_lvl > v_m.level_max then
    insert into match_players (match_id, player_id, status)
      values (p_match, v_me, 'requested')
      on conflict (match_id, player_id) do update set status = 'requested', slot = null;
    perform notify(v_m.host_id, 'join_requested',
      jsonb_build_object('match_id', p_match, 'player_id', v_me));
    return 'requested';
  end if;

  v_slot := free_slot(p_match);
  if v_slot is null then raise exception 'match_full'; end if;
  insert into match_players (match_id, player_id, slot, status)
    values (p_match, v_me, v_slot, 'joined')
    on conflict (match_id, player_id) do update
      set status = 'joined', slot = v_slot, joined_at = now();
  if free_slot(p_match) is null then update matches set status = 'full' where id = p_match; end if;
  perform notify(v_m.host_id, 'player_joined',
    jsonb_build_object('match_id', p_match, 'player_id', v_me));
  return 'joined';
end $$;

create function accept_request(p_match uuid, p_player uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m matches; v_slot smallint;
begin
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is not null then raise exception 'tournament_match'; end if;
  if v_m.host_id is distinct from me() then raise exception 'not_host'; end if;
  if v_m.status <> 'open' or v_m.starts_at <= now() then raise exception 'match_not_open'; end if;
  v_slot := free_slot(p_match);
  if v_slot is null then raise exception 'match_full'; end if;
  update match_players set status = 'joined', slot = v_slot, joined_at = now()
    where match_id = p_match and player_id = p_player and status = 'requested';
  if not found then raise exception 'no_request'; end if;
  if free_slot(p_match) is null then update matches set status = 'full' where id = p_match; end if;
  perform notify(p_player, 'request_accepted', jsonb_build_object('match_id', p_match));
end $$;

create function leave_match(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_m matches;
begin
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is not null then raise exception 'tournament_match'; end if;
  if v_m.host_id = v_me then raise exception 'host_cannot_leave'; end if;  -- cancel instead
  if v_m.status not in ('open', 'full') or v_m.starts_at <= now() then
    raise exception 'match_not_open';
  end if;
  update match_players set status = 'left', slot = null
    where match_id = p_match and player_id = v_me and status in ('joined', 'requested');
  if not found then raise exception 'not_a_player'; end if;
  if v_m.status = 'full' then update matches set status = 'open' where id = p_match; end if;
end $$;

create function cancel_match(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m matches; r record;
begin
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is not null then raise exception 'tournament_match'; end if;
  if v_m.host_id is distinct from me() then raise exception 'not_host'; end if;
  if v_m.status not in ('open', 'full') then raise exception 'match_not_open'; end if;
  update matches set status = 'cancelled' where id = p_match;
  for r in select player_id from match_players
           where match_id = p_match and status = 'joined' and player_id <> v_m.host_id
  loop
    perform notify(r.player_id, 'match_cancelled', jsonb_build_object('match_id', p_match));
  end loop;
end $$;

create function submit_result(p_match uuid, p_sets jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := me(); v_m matches; v_team text; v_prev text; v_winner text; r record;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  select team into v_team from match_players
    where match_id = p_match and player_id = v_me and status = 'joined';
  if v_team is null then raise exception 'not_a_player'; end if;
  if v_m.status <> 'full' or v_m.starts_at > now() then raise exception 'result_not_allowed'; end if;

  select status into v_prev from match_results where match_id = p_match;
  if v_prev is not null and v_prev <> 'disputed' then raise exception 'result_exists'; end if;

  v_winner := save_sets(p_match, p_sets);   -- a disputed result is replaced
  insert into match_results (match_id, submitted_by, winner_team)
    values (p_match, v_me, v_winner);
  for r in select player_id from match_players
           where match_id = p_match and status = 'joined' and team <> v_team
  loop
    perform notify(r.player_id, 'result_submitted', jsonb_build_object('match_id', p_match));
  end loop;
end $$;

create function confirm_result(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_r match_results; v_team text; v_sub_team text;
begin
  select * into v_r from match_results where match_id = p_match for update;
  if not found or v_r.status <> 'pending' then raise exception 'nothing_to_confirm'; end if;
  select team into v_team from match_players
    where match_id = p_match and player_id = v_me and status = 'joined';
  select team into v_sub_team from match_players
    where match_id = p_match and player_id = v_r.submitted_by;
  -- only the other team can confirm
  if v_team is null or v_team = v_sub_team then raise exception 'not_allowed'; end if;

  perform finalize_result(p_match, v_me);
  perform notify(v_r.submitted_by, 'result_confirmed', jsonb_build_object('match_id', p_match));
end $$;

create function dispute_result(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_r match_results; v_team text; v_sub_team text;
begin
  select * into v_r from match_results where match_id = p_match for update;
  if not found or v_r.status <> 'pending' then raise exception 'nothing_to_dispute'; end if;
  select team into v_team from match_players
    where match_id = p_match and player_id = v_me and status = 'joined';
  select team into v_sub_team from match_players
    where match_id = p_match and player_id = v_r.submitted_by;
  if v_team is null or v_team = v_sub_team then raise exception 'not_allowed'; end if;
  update match_results set status = 'disputed' where match_id = p_match;
  perform notify(v_r.submitted_by, 'result_disputed', jsonb_build_object('match_id', p_match));
end $$;

-- If the pending result has gone 7 days without the rival team confirming it,
-- the host may confirm it. Disputed results are not covered: those need a new
-- submission. In a tournament the host is the organizer.
create function host_confirm_result(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_r match_results; v_m matches;
begin
  -- lock the result first, as confirm_result does, so the two cannot deadlock
  select * into v_r from match_results where match_id = p_match for update;
  if not found or v_r.status <> 'pending' then raise exception 'nothing_to_confirm'; end if;
  select * into v_m from matches where id = p_match;
  if v_m.host_id is distinct from v_me then raise exception 'not_host'; end if;
  if v_r.created_at > now() - interval '7 days' then raise exception 'too_early'; end if;

  perform finalize_result(p_match, v_me);
  insert into notifications (player_id, type, payload)
    select player_id, 'result_confirmed', jsonb_build_object('match_id', p_match, 'by_host', true)
    from match_players
    where match_id = p_match and status = 'joined' and player_id <> v_me;
end $$;

-- ---------------------------------------------------------------- RPC: tournaments

create function create_tournament(
  p_name text, p_description text, p_place text, p_starts_at timestamptz,
  p_players int, p_round_days int default 7) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_id uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if p_players not in (8, 16, 32) then raise exception 'invalid_size'; end if;
  if p_starts_at <= now() then raise exception 'starts_in_past'; end if;
  insert into tournaments (organizer_id, name, description, place, starts_at, max_pairs, round_days)
    values (v_me, trim(p_name), p_description, trim(p_place), p_starts_at, p_players / 2, p_round_days)
    returning id into v_id;
  return v_id;
end $$;

-- The caller names a partner (picked from the player search). The partner gets
-- an invite and must accept before the pair counts.
create function register_pair(p_tournament uuid, p_partner uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_t tournaments; v_partner profiles; v_id uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_t from tournaments where id = p_tournament for update;
  if not found then raise exception 'tournament_not_found'; end if;
  if v_t.status <> 'registration' then raise exception 'registration_closed'; end if;
  if p_partner = v_me then raise exception 'partner_is_self'; end if;
  select * into v_partner from profiles where id = p_partner;
  if not found or v_partner.is_deleted then raise exception 'partner_not_found'; end if;
  if exists (select 1 from tournament_pairs
             where tournament_id = p_tournament and status <> 'withdrawn'
               and (v_me in (player1_id, player2_id) or p_partner in (player1_id, player2_id))) then
    raise exception 'already_in_tournament';
  end if;
  insert into tournament_pairs (tournament_id, player1_id, player2_id)
    values (p_tournament, v_me, p_partner) returning id into v_id;
  perform notify(p_partner, 'tournament_pair_invite',
    jsonb_build_object('tournament_id', p_tournament, 'pair_id', v_id, 'from', v_me));
  return v_id;
end $$;

create function respond_pair_invite(p_pair uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_p tournament_pairs; v_t tournaments; v_n int;
begin
  select * into v_p from tournament_pairs where id = p_pair;
  if not found then raise exception 'pair_not_found'; end if;
  select * into v_t from tournaments where id = v_p.tournament_id for update;
  select * into v_p from tournament_pairs where id = p_pair;   -- re-read under the lock
  if v_p.player2_id is distinct from v_me then raise exception 'not_invited'; end if;
  if v_p.status <> 'pending' then raise exception 'nothing_to_answer'; end if;
  if v_t.status <> 'registration' then raise exception 'registration_closed'; end if;

  if not p_accept then
    update tournament_pairs set status = 'withdrawn' where id = p_pair;
    perform notify(v_p.player1_id, 'tournament_pair_accepted',
      jsonb_build_object('tournament_id', v_t.id, 'pair_id', p_pair, 'accepted', false));
    return;
  end if;

  select count(*) into v_n from tournament_pairs
    where tournament_id = v_t.id and status = 'confirmed';
  if v_n >= v_t.max_pairs then raise exception 'tournament_full'; end if;
  update tournament_pairs set status = 'confirmed' where id = p_pair;
  perform notify(v_p.player1_id, 'tournament_pair_accepted',
    jsonb_build_object('tournament_id', v_t.id, 'pair_id', p_pair, 'accepted', true));
  if v_n + 1 = v_t.max_pairs then perform draw_tournament(v_t.id); end if;
end $$;

create function withdraw_pair(p_pair uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_p tournament_pairs; v_t tournaments;
begin
  select * into v_p from tournament_pairs where id = p_pair;
  if not found then raise exception 'pair_not_found'; end if;
  select * into v_t from tournaments where id = v_p.tournament_id for update;
  select * into v_p from tournament_pairs where id = p_pair;
  if v_me is null or v_me not in (v_p.player1_id, v_p.player2_id) then
    raise exception 'not_allowed';
  end if;
  if v_p.status = 'withdrawn' then raise exception 'nothing_to_withdraw'; end if;
  if v_t.status <> 'registration' then raise exception 'registration_closed'; end if;
  update tournament_pairs set status = 'withdrawn' where id = p_pair;
  perform notify(case when v_me = v_p.player1_id then v_p.player2_id else v_p.player1_id end,
    'tournament_pair_withdrawn',
    jsonb_build_object('tournament_id', v_t.id, 'pair_id', p_pair));
end $$;

create function cancel_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_t tournaments;
begin
  select * into v_t from tournaments where id = p_tournament for update;
  if not found then raise exception 'tournament_not_found'; end if;
  if v_t.organizer_id is distinct from me() then raise exception 'not_organizer'; end if;
  if v_t.status not in ('registration', 'in_progress') then raise exception 'tournament_closed'; end if;
  update tournaments set status = 'cancelled' where id = p_tournament;
  update matches set status = 'cancelled'
    where tournament_id = p_tournament and status in ('open', 'full');
  insert into notifications (player_id, type, payload)
    select unnest(array[player1_id, player2_id]), 'tournament_cancelled',
           jsonb_build_object('tournament_id', p_tournament)
    from tournament_pairs where tournament_id = p_tournament and status in ('pending', 'confirmed');
end $$;

-- The organizer is the referee: if a pair never answers or keeps disputing,
-- they set the final result. p_sets has the same format as submit_result.
create function organizer_set_result(p_match uuid, p_sets jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_m matches; v_winner text;
begin
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is null then raise exception 'not_tournament_match'; end if;
  if v_m.host_id is distinct from v_me then raise exception 'not_organizer'; end if;
  if v_m.status <> 'full' then raise exception 'result_not_allowed'; end if;
  v_winner := save_sets(p_match, p_sets);
  insert into match_results (match_id, submitted_by, winner_team)
    values (p_match, v_me, v_winner);
  perform finalize_result(p_match, v_me);
end $$;

-- The pairs of a tournament match agree a date; moving it also moves the
-- end-of-match reminder.
create function reschedule_match(p_match uuid, p_starts_at timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); v_m matches;
begin
  select * into v_m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_m.tournament_id is null then raise exception 'not_tournament_match'; end if;
  if v_m.host_id is distinct from v_me and not exists (
       select 1 from match_players
       where match_id = p_match and player_id = v_me and status = 'joined') then
    raise exception 'not_allowed';
  end if;
  if v_m.status <> 'full' then raise exception 'match_not_open'; end if;
  if exists (select 1 from match_results where match_id = p_match) then
    raise exception 'result_exists';
  end if;
  if p_starts_at <= now() then raise exception 'starts_in_past'; end if;
  update matches set starts_at = p_starts_at, result_reminded_at = null where id = p_match;
end $$;

-- ---------------------------------------------------------------- reminders

-- One reminder per match, when it ends (starts_at + duration). Players with no
-- result yet are told to enter it; the app shows "confirm" if one is pending.
-- Run every 5 minutes by pg_cron.
create function send_result_reminders() returns integer
language sql security definer set search_path = public as $$
  with due as (
    update matches set result_reminded_at = now()
    where status = 'full' and result_reminded_at is null
      and starts_at + make_interval(mins => duration_minutes) <= now()
    returning id
  ), ins as (
    insert into notifications (player_id, type, payload)
    select mp.player_id, 'result_reminder', jsonb_build_object('match_id', due.id)
    from due
    join match_players mp on mp.match_id = due.id and mp.status = 'joined'
    returning 1
  )
  select count(*)::int from ins
$$;

-- One follow-up to the rival team when a submitted result is still pending
-- after 24 hours. Run daily by pg_cron.
create function send_confirm_followups() returns integer
language sql security definer set search_path = public as $$
  with due as (
    update match_results set followup_sent_at = now()
    where status = 'pending' and followup_sent_at is null
      and created_at <= now() - interval '24 hours'
    returning match_id, submitted_by
  ), ins as (
    insert into notifications (player_id, type, payload)
    select mp.player_id, 'result_reminder',
           jsonb_build_object('match_id', due.match_id, 'kind', 'confirm')
    from due
    join match_players sub on sub.match_id = due.match_id and sub.player_id = due.submitted_by
    join match_players mp on mp.match_id = due.match_id and mp.status = 'joined'
                          and mp.team <> sub.team
    returning 1
  )
  select count(*)::int from ins
$$;

-- On Supabase, schedule both (pg_cron):
--   select cron.schedule('result-reminders', '*/5 * * * *', 'select send_result_reminders()');
--   select cron.schedule('confirm-followups', '0 9 * * *', 'select send_confirm_followups()');

-- ---------------------------------------------------------------- account

-- Anonymises the player and frees their future matches. The login itself is
-- removed afterwards by the delete-user Edge Function (service role), which
-- sets profiles.auth_id to null through the "on delete set null" rule.
-- Tournament matches are left alone: in a running tournament the organizer
-- settles them with organizer_set_result.
create function delete_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := me(); t record; v_new uuid;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  update tournament_pairs set status = 'withdrawn'
    where status in ('pending', 'confirmed') and v_me in (player1_id, player2_id)
      and tournament_id in (select id from tournaments where status = 'registration');
  -- Tournaments they organise pass to a player registered in them (the earliest
  -- confirmed pair first). Only a tournament still in registration with nobody
  -- registered is cancelled.
  for t in select id, status from tournaments
           where organizer_id = v_me and status in ('registration', 'in_progress')
  loop
    select pl.pid into v_new
      from tournament_pairs tp
      cross join lateral (values (tp.player1_id, 1), (tp.player2_id, 2)) as pl(pid, ord)
      join profiles p on p.id = pl.pid and not p.is_deleted and p.id <> v_me
      where tp.tournament_id = t.id and tp.status = 'confirmed'
      order by tp.created_at, pl.ord
      limit 1;
    if v_new is not null then
      update tournaments set organizer_id = v_new where id = t.id;
      update matches set host_id = v_new where tournament_id = t.id and host_id = v_me;
      perform notify(v_new, 'tournament_organizer_assigned',
        jsonb_build_object('tournament_id', t.id));
    elsif t.status = 'registration' then
      update tournaments set status = 'cancelled' where id = t.id;
    end if;
  end loop;
  update matches set status = 'cancelled'
    where host_id = v_me and status in ('open', 'full') and tournament_id is null;
  update match_players set status = 'left', slot = null
    where player_id = v_me and status in ('joined', 'requested')
      and match_id in (select id from matches
                       where status in ('open', 'full') and starts_at > now()
                         and tournament_id is null);
  update matches m set status = 'open'
    where m.status = 'full' and m.starts_at > now() and m.tournament_id is null
      and (select count(*) from match_players
           where match_id = m.id and status = 'joined') < 4;
  delete from follows where follower_id = v_me or followed_id = v_me;
  delete from notifications where player_id = v_me;
  delete from push_tokens where player_id = v_me;
  update profiles set display_name = 'Deleted player', avatar_url = null, city = null,
    hand = null, court_side = null, is_deleted = true where id = v_me;
end $$;

-- ---------------------------------------------------------------- ranking

-- one row per player per confirmed competitive match (tournament matches included)
create view player_match_results with (security_invoker = true) as
select mp.player_id, mp.match_id, m.starts_at, (mp.team = r.winner_team) as won
from match_players mp
join matches m on m.id = mp.match_id
join match_results r on r.match_id = m.id
where mp.status = 'joined' and m.type = 'competitive' and r.status = 'confirmed';

-- p_since filters by period (season = start date; null = all time)
create function ranking(p_since timestamptz default null)
returns table (player_id uuid, display_name text, avatar_url text, level numeric,
               played bigint, won bigint, lost bigint, win_rate numeric)
language sql stable set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.level,
         count(r.match_id),
         count(*) filter (where r.won),
         count(*) filter (where r.won is false),
         case when count(r.match_id) = 0 then 0
              else round(100.0 * count(*) filter (where r.won) / count(r.match_id), 1) end
  from profiles p
  left join player_match_results r
    on r.player_id = p.id and (p_since is null or r.starts_at >= p_since)
  where not p.is_deleted
  group by p.id
  order by 6 desc, 8 desc, 5 desc, 2
$$;

-- ---------------------------------------------------------------- access

alter table profiles enable row level security;
alter table matches enable row level security;
alter table match_players enable row level security;
alter table match_results enable row level security;
alter table set_scores enable row level security;
alter table rating_changes enable row level security;
alter table follows enable row level security;
alter table notifications enable row level security;
alter table push_tokens enable row level security;
alter table tournaments enable row level security;
alter table tournament_pairs enable row level security;
alter table tournament_ties enable row level security;

-- community data is readable by any signed-in member
create policy read_all on profiles for select to authenticated using (true);
create policy read_all on matches for select to authenticated using (true);
create policy read_all on match_players for select to authenticated using (true);
create policy read_all on match_results for select to authenticated using (true);
create policy read_all on set_scores for select to authenticated using (true);
create policy read_all on rating_changes for select to authenticated using (true);
create policy read_all on follows for select to authenticated using (true);
create policy read_all on tournaments for select to authenticated using (true);
create policy read_all on tournament_pairs for select to authenticated using (true);
create policy read_all on tournament_ties for select to authenticated using (true);

-- direct writes allowed from the app
create policy edit_own on profiles for update to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());
create policy create_own on matches for insert to authenticated
  with check (host_id = me() and status = 'open' and tournament_id is null);
create policy follow on follows for insert to authenticated with check (follower_id = me());
create policy unfollow on follows for delete to authenticated using (follower_id = me());
create policy own_notifications on notifications for select to authenticated
  using (player_id = me());
create policy own_notifications_read on notifications for update to authenticated
  using (player_id = me()) with check (player_id = me());
create policy own_tokens on push_tokens for all to authenticated
  using (player_id = me()) with check (player_id = me());

-- column grants: users cannot edit their own level or reliability
revoke update on profiles from authenticated, anon;
grant update (display_name, avatar_url, city, hand, court_side, locale)
  on profiles to authenticated;
revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;

-- functions: signed-in members only; internal ones are not callable at all
revoke all on function notify(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function free_slot(uuid) from public, anon, authenticated;
revoke all on function apply_ratings(uuid) from public, anon, authenticated;
revoke all on function save_sets(uuid, jsonb) from public, anon, authenticated;
revoke all on function finalize_result(uuid, uuid) from public, anon, authenticated;
revoke all on function create_tie_match(uuid) from public, anon, authenticated;
revoke all on function draw_tournament(uuid) from public, anon, authenticated;
revoke all on function advance_tournament(uuid) from public, anon, authenticated;
revoke all on function send_result_reminders() from public, anon, authenticated;
revoke all on function send_confirm_followups() from public, anon, authenticated;

revoke all on function join_match(uuid) from public, anon;
revoke all on function accept_request(uuid, uuid) from public, anon;
revoke all on function leave_match(uuid) from public, anon;
revoke all on function cancel_match(uuid) from public, anon;
revoke all on function submit_result(uuid, jsonb) from public, anon;
revoke all on function confirm_result(uuid) from public, anon;
revoke all on function dispute_result(uuid) from public, anon;
revoke all on function delete_account() from public, anon;
revoke all on function ranking(timestamptz) from public, anon;
revoke all on function create_tournament(text, text, text, timestamptz, int, int) from public, anon;
revoke all on function register_pair(uuid, uuid) from public, anon;
revoke all on function respond_pair_invite(uuid, boolean) from public, anon;
revoke all on function withdraw_pair(uuid) from public, anon;
revoke all on function cancel_tournament(uuid) from public, anon;
revoke all on function organizer_set_result(uuid, jsonb) from public, anon;
revoke all on function reschedule_match(uuid, timestamptz) from public, anon;
revoke all on function host_confirm_result(uuid) from public, anon;
grant execute on function join_match(uuid), accept_request(uuid, uuid), leave_match(uuid),
  cancel_match(uuid), submit_result(uuid, jsonb), confirm_result(uuid),
  dispute_result(uuid), delete_account(), ranking(timestamptz),
  create_tournament(text, text, text, timestamptz, int, int), register_pair(uuid, uuid),
  respond_pair_invite(uuid, boolean), withdraw_pair(uuid), cancel_tournament(uuid),
  organizer_set_result(uuid, jsonb), reschedule_match(uuid, timestamptz),
  host_confirm_result(uuid) to authenticated;
