// Runs the schema migration (supabase/migrations/20261114000100_schema.sql) on an
// in-memory Postgres (PGlite) and checks the rules.
//
//   PGLITE_ENTRY=/path/to/node_modules/@electric-sql/pglite/dist/index.js \
//     node replica/tests/schema.test.mjs
//
// Not covered: real concurrency. PGlite has one connection, so two people
// joining the last slot at the same moment cannot be simulated. The row lock in
// join_match and the unique slot index are what protect that case; the index is
// tested directly below.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const entry = process.env.PGLITE_ENTRY;
if (!entry) { console.error('Set PGLITE_ENTRY to the pglite dist/index.js path'); process.exit(2); }
const { PGlite } = await import(pathToFileURL(entry).href);
const schema = readFileSync(new URL('../../supabase/migrations/20261114000100_schema.sql', import.meta.url), 'utf8');

const db = new PGlite();
// Stand-ins for what Supabase provides: roles, auth.users, auth.uid(), and the
// default grants it gives new tables and functions.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(), email text,
    raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);
await db.exec(schema);

// ---------------------------------------------------------------- helpers
const su = async (sql, params = []) => { await db.exec('reset role'); return db.query(sql, params); };
const as = async (user, sql, params = [], role = 'authenticated') => {
  await db.exec(`reset role; set role ${role}`);
  await db.query(`select set_config('app.uid', $1, false)`, [user ? user.auth : '']);
  try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
};
const expectErr = async (fn, text) => {
  try { await fn(); } catch (e) {
    if (!String(e.message).includes(text)) throw new Error(`expected "${text}", got "${e.message}"`);
    return;
  }
  throw new Error(`expected error "${text}", but it succeeded`);
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const eq = (a, b, msg) => assert(String(a) === String(b), `${msg}: expected ${b}, got ${a}`);

let n = 0;
const users = [];
async function signup(name, locale = 'es') {
  const auth = (await su(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [`u${++n}@example.com`, JSON.stringify({ display_name: name, locale })])).rows[0].id;
  const id = (await su(`select id from profiles where auth_id = $1`, [auth])).rows[0].id;
  const u = { auth, id, name };
  users.push(u);
  return u;
}
const level = async (u) => Number((await su(`select level from profiles where id = $1`, [u.id])).rows[0].level);
const count = async (sql, params = []) => Number((await su(`select count(*)::int as c from (${sql}) x`, params)).rows[0].c);
const notifs = (u, type) => count(`select 1 from notifications where player_id = $1 and type = $2`, [u.id, type]);

// A full match built directly (join_match refuses past dates). players[0] is the host.
async function fullMatch(players, { type = 'competitive', start = `now() - interval '3 hours'`, duration = 90 } = {}) {
  const id = (await su(
    `insert into matches (host_id, starts_at, duration_minutes, place, type, status)
     values ($1, ${start}, $2, 'Court 1', $3, 'full') returning id`,
    [players[0].id, duration, type])).rows[0].id;
  for (let i = 1; i < 4; i++) {
    await su(`insert into match_players (match_id, player_id, slot, status) values ($1, $2, $3, 'joined')`,
      [id, players[i].id, i + 1]);
  }
  return id;
}
const A_WINS = [{ a: 6, b: 3 }, { a: 6, b: 4 }];
// matches are created only through create_match(); returns the new id
const createMatch = async (u, place, min = 1, max = 10, start = `now() + interval '1 day'`) =>
  (await as(u, `select create_match(${start}, 90, $1, 'competitive', $2, $3) as id`, [place, min, max])).rows[0].id;
const B_WINS = [{ a: 3, b: 6 }, { a: 4, b: 6 }];

const P = [];
for (let i = 0; i < 16; i++) P.push(await signup(`Player ${i}`, i === 0 ? 'en' : 'es'));
const ORG = P[8];

// ---------------------------------------------------------------- tests
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('signup is open and creates a profile with the chosen language', async () => {
  const r = (await su(`select display_name, locale, level from profiles where id = $1`, [P[0].id])).rows[0];
  eq(r.display_name, 'Player 0', 'name'); eq(r.locale, 'en', 'locale'); eq(Number(r.level), 4, 'level');
});

test('members cannot edit their own level, but can edit their name', async () => {
  await expectErr(() => as(P[0], `update profiles set level = 9 where id = $1`, [P[0].id]), 'permission denied');
  await as(P[0], `update profiles set display_name = 'Zed' where id = $1`, [P[0].id]);
  eq((await su(`select display_name from profiles where id = $1`, [P[0].id])).rows[0].display_name, 'Zed', 'name');
  await su(`update profiles set display_name = 'Player 0' where id = $1`, [P[0].id]);
});

test('clients cannot write match_players or tournament matches directly', async () => {
  await expectErr(() => as(P[0], `insert into match_players (match_id, player_id, slot) values (gen_random_uuid(), $1, 1)`, [P[0].id]), 'row-level security');
  await expectErr(() => as(P[0], `insert into matches (host_id, starts_at, place, tournament_id)
    values ($1, now() + interval '1 day', 'X1', gen_random_uuid())`, [P[0].id]), 'row-level security');
  // even a normal match: they are created only through create_match()
  await expectErr(() => as(P[0], `insert into matches (host_id, starts_at, place)
    values ($1, now() + interval '1 day', 'X1')`, [P[0].id]), 'row-level security');
  await expectErr(() => as(null, `select join_match(gen_random_uuid())`, [], 'anon'), 'permission denied');
});

test('creating a match puts the host in slot 1; joins fill slots; a full match is closed', async () => {
  const m = await createMatch(P[0], 'Court 1', 3, 5);
  eq(await count(`select 1 from match_players where match_id = $1 and slot = 1 and player_id = $2`, [m, P[0].id]), 1, 'host slot');
  eq((await as(P[1], `select join_match($1) as r`, [m])).rows[0].r, 'joined', 'p1');
  await expectErr(() => as(P[1], `select join_match($1)`, [m]), 'already_joined');
  await as(P[2], `select join_match($1)`, [m]);
  await as(P[3], `select join_match($1)`, [m]);
  eq((await su(`select status from matches where id = $1`, [m])).rows[0].status, 'full', 'status');
  await expectErr(() => as(P[4], `select join_match($1)`, [m]), 'match_not_open');
  // the unique index is the last guard against two players in one slot
  await expectErr(() => su(`insert into match_players (match_id, player_id, slot, status) values ($1, $2, 1, 'joined')`, [m, P[4].id]), 'match_players_slot_uq');
  // leaving reopens it
  await as(P[3], `select leave_match($1)`, [m]);
  eq((await su(`select status from matches where id = $1`, [m])).rows[0].status, 'open', 'reopened');
  await expectErr(() => as(P[0], `select leave_match($1)`, [m]), 'host_cannot_leave');
});

test('a player outside the level range asks for a slot and the host accepts', async () => {
  const m = await createMatch(P[5], 'Court 2', 7, 9);
  eq((await as(P[6], `select join_match($1) as r`, [m])).rows[0].r, 'requested', 'requested');
  eq(await notifs(P[5], 'join_requested'), 1, 'host notified');
  await expectErr(() => as(P[6], `select accept_request($1, $2)`, [m, P[6].id]), 'not_host');
  await as(P[5], `select accept_request($1, $2)`, [m, P[6].id]);
  eq(await count(`select 1 from match_players where match_id = $1 and player_id = $2 and status = 'joined'`, [m, P[6].id]), 1, 'joined');
  await as(P[5], `select cancel_match($1)`, [m]);
  eq((await su(`select status from matches where id = $1`, [m])).rows[0].status, 'cancelled', 'cancelled');
});

test('friendly result: the rival confirms, the match is played, levels do not move', async () => {
  const m = await fullMatch([P[0], P[1], P[2], P[3]], { type: 'friendly' });
  await expectErr(() => as(P[4], `select submit_result($1, $2)`, [m, JSON.stringify(A_WINS)]), 'not_a_player');
  await expectErr(() => as(P[0], `select submit_result($1, $2)`, [m, JSON.stringify([{ a: 6, b: 3 }, { a: 3, b: 6 }])]), 'invalid_sets');
  await as(P[0], `select submit_result($1, $2)`, [m, JSON.stringify(A_WINS)]);
  eq(await notifs(P[2], 'result_submitted'), 1, 'rival notified');
  await expectErr(() => as(P[1], `select confirm_result($1)`, [m]), 'not_allowed');   // own team
  await expectErr(() => as(P[0], `select submit_result($1, $2)`, [m, JSON.stringify(A_WINS)]), 'result_exists');
  await as(P[2], `select confirm_result($1)`, [m]);
  eq((await su(`select status from matches where id = $1`, [m])).rows[0].status, 'played', 'played');
  eq(await level(P[0]), 4, 'level unchanged');
  eq(await count(`select 1 from rating_changes where match_id = $1`, [m]), 0, 'no rating rows');
});

test('competitive result: dispute, resubmit, confirm, then levels and ranking move', async () => {
  const m = await fullMatch([P[0], P[1], P[2], P[3]]);
  await as(P[0], `select submit_result($1, $2)`, [m, JSON.stringify(B_WINS)]);   // submitter got it wrong
  await as(P[2], `select dispute_result($1)`, [m]);
  eq((await su(`select status from match_results where match_id = $1`, [m])).rows[0].status, 'disputed', 'disputed');
  eq(await level(P[0]), 4, 'no change while disputed');
  await as(P[0], `select submit_result($1, $2)`, [m, JSON.stringify(A_WINS)]);   // replaces it
  eq(await count(`select 1 from set_scores where match_id = $1`, [m]), 2, 'old sets replaced');
  await as(P[3], `select confirm_result($1)`, [m]);
  const [w, l] = [await level(P[0]), await level(P[2])];
  assert(Math.abs(w - 4.11) < 0.011 && Math.abs(l - 3.89) < 0.011, `levels ${w} / ${l}`);
  eq(await count(`select 1 from rating_changes where match_id = $1`, [m]), 4, 'rating rows');
  const rows = (await as(P[0], `select player_id, played::int, won::int, lost::int, win_rate::float from ranking()`)).rows;
  const r0 = rows.find(r => r.player_id === P[0].id), r2 = rows.find(r => r.player_id === P[2].id);
  eq(r0.played, 1, 'played'); eq(r0.won, 1, 'won'); eq(r0.win_rate, 100, 'win rate');
  eq(r2.lost, 1, 'lost'); eq(r2.win_rate, 0, 'loser win rate');
  eq(rows[0].player_id === P[0].id || rows[0].player_id === P[1].id, true, 'winners rank first');
});

test('end-of-match reminder: once per match, only after it ends, then a 24h follow-up', async () => {
  const [a, b, c, d] = [P[4], P[5], P[6], P[7]];
  const ended = await fullMatch([a, b, c, d], { start: `now() - interval '3 hours'`, duration: 90 });
  await fullMatch([a, b, c, d], { start: `now() - interval '30 minutes'`, duration: 90 });   // still playing
  await fullMatch([a, b, c, d], { start: `now() + interval '2 days'` });                     // not started
  eq((await su(`select send_result_reminders() as n`)).rows[0].n, 4, 'first run');
  eq((await su(`select send_result_reminders() as n`)).rows[0].n, 0, 'second run');
  eq(await notifs(a, 'result_reminder'), 1, 'one reminder each');
  eq((await su(`select count(*)::int c from notifications where payload->>'match_id' = $1 and type = 'result_reminder'`, [ended])).rows[0].c, 4, 'match reminded');
  // a submitted result nobody confirms gets one follow-up to the rival team
  await as(a, `select submit_result($1, $2)`, [ended, JSON.stringify(A_WINS)]);
  eq((await su(`select send_confirm_followups() as n`)).rows[0].n, 0, 'too early');
  await su(`update match_results set created_at = now() - interval '25 hours' where match_id = $1`, [ended]);
  eq((await su(`select send_confirm_followups() as n`)).rows[0].n, 2, 'follow-up to rivals');
  eq((await su(`select send_confirm_followups() as n`)).rows[0].n, 0, 'only once');
  eq(await count(`select 1 from notifications where player_id = $1 and payload->>'kind' = 'confirm'`, [c.id]), 1, 'rival got it');
  eq(await count(`select 1 from notifications where player_id = $1 and payload->>'kind' = 'confirm'`, [a.id]), 0, 'submitter did not');
});

// ----- tournaments
const T = { id: null, pairs: [] };
const newTournament = async (org, players = 8) =>
  (await as(org, `select create_tournament('Padel & Piwo Cup', 'x', 'Court 1', now() + interval '2 days', $1, 7) as id`, [players])).rows[0].id;
const register = async (t, a, b) => (await as(a, `select register_pair($1, $2) as id`, [t, b.id])).rows[0].id;
const accept = (pair, b) => as(b, `select respond_pair_invite($1, true)`, [pair]);
const byId = (id) => users.find(u => u.id === id);

test('tournament sizes and registration rules', async () => {
  await expectErr(() => as(ORG, `select create_tournament('Cup', '', 'Court 1', now() + interval '2 days', 12, 7)`), 'invalid_size');
  await expectErr(() => as(ORG, `select create_tournament('Cup', '', 'Court 1', now() - interval '1 day', 8, 7)`), 'starts_in_past');
  for (const [players, pairs] of [[8, 4], [16, 8], [32, 16]]) {
    const t = await newTournament(ORG, players);
    eq((await su(`select max_pairs from tournaments where id = $1`, [t])).rows[0].max_pairs, pairs, `${players} players`);
    // an organizer may only have 2 tournaments taking entries, so clear these test ones
    await as(ORG, `select cancel_tournament($1)`, [t]);
  }
  T.id = await newTournament(ORG, 8);
  await expectErr(() => as(P[0], `select register_pair($1, $2)`, [T.id, P[0].id]), 'partner_is_self');
  const first = await register(T.id, P[0], P[1]);
  eq(await notifs(P[1], 'tournament_pair_invite'), 1, 'partner invited');
  await expectErr(() => as(P[0], `select register_pair($1, $2)`, [T.id, P[2].id]), 'already_in_tournament');
  await expectErr(() => as(P[2], `select register_pair($1, $2)`, [T.id, P[1].id]), 'already_in_tournament'); // partner already named
  await expectErr(() => as(P[1], `select register_pair($1, $2)`, [T.id, P[2].id]), 'already_in_tournament'); // is player2 elsewhere
  await expectErr(() => as(P[2], `select respond_pair_invite($1, true)`, [first]), 'not_invited');
  // declining frees both players to register again
  const declined = await register(T.id, P[2], P[3]);
  await as(P[3], `select respond_pair_invite($1, false)`, [declined]);
  eq(await notifs(P[2], 'tournament_pair_declined'), 1, 'registrant told');
  // withdrawing works too
  const again = await register(T.id, P[2], P[3]);
  await as(P[2], `select withdraw_pair($1)`, [again]);
  eq(await notifs(P[3], 'tournament_pair_withdrawn'), 1, 'partner told');
  T.pairs = [first, await register(T.id, P[2], P[3]), await register(T.id, P[4], P[5]), await register(T.id, P[6], P[7])];
  // pending pairs do not fill the cap and nothing is drawn yet
  eq((await su(`select status from tournaments where id = $1`, [T.id])).rows[0].status, 'registration', 'still open');
  eq(await count(`select 1 from tournament_ties where tournament_id = $1`, [T.id]), 0, 'no bracket yet');
});

test('the draw happens when the last pair accepts: random seeds, full bracket, first matches', async () => {
  const partners = [P[1], P[3], P[5], P[7]];
  for (let i = 0; i < 3; i++) await accept(T.pairs[i], partners[i]);
  eq((await su(`select status from tournaments where id = $1`, [T.id])).rows[0].status, 'registration', 'not yet');
  await accept(T.pairs[3], partners[3]);
  eq((await su(`select status from tournaments where id = $1`, [T.id])).rows[0].status, 'in_progress', 'drawn');
  eq(await count(`select 1 from tournament_ties where tournament_id = $1`, [T.id]), 3, 'ties = 2 + 1');
  const seeds = (await su(`select seed::int from tournament_pairs where tournament_id = $1 and status = 'confirmed' order by seed`, [T.id])).rows.map(r => r.seed);
  eq(seeds.join(','), '1,2,3,4', 'seeds');
  const r1 = (await su(`select * from tournament_ties where tournament_id = $1 and round_no = 1 order by pos`, [T.id])).rows;
  eq(r1.length, 2, 'round 1 ties');
  for (const t of r1) {
    assert(t.pair_a_id && t.pair_b_id && t.match_id, 'round 1 tie is filled and has a match');
    const m = (await su(`select host_id, type, status from matches where id = $1`, [t.match_id])).rows[0];
    eq(m.host_id, ORG.id, 'organizer is host'); eq(m.type, 'competitive', 'type'); eq(m.status, 'full', 'status');
    eq(await count(`select 1 from match_players where match_id = $1 and status = 'joined'`, [t.match_id]), 4, 'four players');
  }
  const r2 = (await su(`select * from tournament_ties where tournament_id = $1 and round_no = 2`, [T.id])).rows[0];
  assert(!r2.pair_a_id && !r2.pair_b_id && !r2.match_id, 'final waits for the winners');
  eq(await count(`select 1 from notifications where type = 'tournament_started' and payload->>'tournament_id' = $1`, [T.id]), 8, 'all 8 told');
  eq(await count(`select 1 from notifications where type = 'tournament_match_ready' and payload->>'tournament_id' = $1`, [T.id]), 8, 'match ready x8');
  await expectErr(() => as(P[8], `select register_pair($1, $2)`, [T.id, P[9].id]), 'registration_closed');
  await expectErr(() => as(P[0], `select withdraw_pair($1)`, [T.pairs[0]]), 'registration_closed');
});

test('tournament matches cannot be joined, left or cancelled like open matches', async () => {
  const m = (await su(`select match_id from tournament_ties where tournament_id = $1 and round_no = 1 limit 1`, [T.id])).rows[0].match_id;
  const player = (await su(`select player_id from match_players where match_id = $1 limit 1`, [m])).rows[0].player_id;
  await expectErr(() => as(P[12], `select join_match($1)`, [m]), 'tournament_match');
  await expectErr(() => as(byId(player), `select leave_match($1)`, [m]), 'tournament_match');
  await expectErr(() => as(ORG, `select cancel_match($1)`, [m]), 'tournament_match');
});

test('winners advance: players confirm one match, the organizer settles the other, a champion is named', async () => {
  const r1 = (await su(`select t.*, pa.player1_id as a1, pb.player1_id as b1
    from tournament_ties t join tournament_pairs pa on pa.id = t.pair_a_id join tournament_pairs pb on pb.id = t.pair_b_id
    where t.tournament_id = $1 and t.round_no = 1 order by t.pos`, [T.id])).rows;

  // players can only enter a result once the match has started
  await expectErr(() => as(byId(r1[0].a1), `select submit_result($1, $2)`, [r1[0].match_id, JSON.stringify(A_WINS)]), 'result_not_allowed');
  await su(`update matches set starts_at = now() - interval '2 hours' where id = $1`, [r1[0].match_id]);

  // tie 1: team A wins, confirmed by the rival
  await as(byId(r1[0].a1), `select submit_result($1, $2)`, [r1[0].match_id, JSON.stringify(A_WINS)]);
  await as(byId(r1[0].b1), `select confirm_result($1)`, [r1[0].match_id]);
  // tie 2: the organizer settles it, team B wins; a regular player cannot do that
  await expectErr(() => as(byId(r1[1].a1), `select organizer_set_result($1, $2)`, [r1[1].match_id, JSON.stringify(B_WINS)]), 'not_organizer');
  await as(ORG, `select organizer_set_result($1, $2)`, [r1[1].match_id, JSON.stringify(B_WINS)]);
  const done = (await su(`select pos, winner_pair_id from tournament_ties where tournament_id = $1 and round_no = 1 order by pos`, [T.id])).rows;
  eq(done[0].winner_pair_id, r1[0].pair_a_id, 'tie 1 winner');
  eq(done[1].winner_pair_id, r1[1].pair_b_id, 'tie 2 winner');

  const final = (await su(`select * from tournament_ties where tournament_id = $1 and round_no = 2`, [T.id])).rows[0];
  eq(final.pair_a_id, r1[0].pair_a_id, 'final side A'); eq(final.pair_b_id, r1[1].pair_b_id, 'final side B');
  assert(final.match_id, 'final has a match');
  eq((await su(`select status from tournaments where id = $1`, [T.id])).rows[0].status, 'in_progress', 'still running');

  // the pair moves the final date; the reminder moves with it
  const finalPlayers = (await su(`select player_id from match_players where match_id = $1 order by slot`, [final.match_id])).rows.map(r => byId(r.player_id));
  await su(`update matches set result_reminded_at = now() where id = $1`, [final.match_id]);
  await expectErr(() => as(finalPlayers[0], `select reschedule_match($1, now() - interval '1 day')`, [final.match_id]), 'starts_in_past');
  await expectErr(() => as(P[12], `select reschedule_match($1, now() + interval '3 days')`, [final.match_id]), 'not_allowed');
  await as(finalPlayers[0], `select reschedule_match($1, now() + interval '3 days')`, [final.match_id]);
  const mm = (await su(`select result_reminded_at from matches where id = $1`, [final.match_id])).rows[0];
  eq(mm.result_reminded_at, null, 'reminder reset');

  // the final: B (winner of tie 2) beats A; players must wait for the match to have started
  await su(`update matches set starts_at = now() - interval '2 hours' where id = $1`, [final.match_id]);
  await as(finalPlayers[0], `select submit_result($1, $2)`, [final.match_id, JSON.stringify(B_WINS)]);
  await as(finalPlayers[2], `select confirm_result($1)`, [final.match_id]);
  const t = (await su(`select status, champion_pair_id from tournaments where id = $1`, [T.id])).rows[0];
  eq(t.status, 'finished', 'finished'); eq(t.champion_pair_id, r1[1].pair_b_id, 'champion');
  eq(await count(`select 1 from notifications where type = 'tournament_finished' and payload->>'tournament_id' = $1`, [T.id]), 2, 'champions told');
  // tournament matches are competitive: levels moved
  assert(await count(`select 1 from rating_changes rc join matches m on m.id = rc.match_id where m.tournament_id = $1`, [T.id]) === 12, 'rating rows for 3 matches x 4 players');
});

test('a 32-player tournament (16 pairs) draws a 4-round bracket with 8 first matches', async () => {
  const t = await newTournament(ORG, 32);
  for (let i = 0; i < 16; i++) {
    const a = (await su(`insert into profiles (display_name) values ('Bulk ${i}a') returning id`)).rows[0].id;
    const b = (await su(`insert into profiles (display_name) values ('Bulk ${i}b') returning id`)).rows[0].id;
    await su(`insert into tournament_pairs (tournament_id, player1_id, player2_id, status) values ($1, $2, $3, 'confirmed')`, [t, a, b]);
  }
  await su(`select draw_tournament($1)`, [t]);
  eq(await count(`select 1 from tournament_ties where tournament_id = $1`, [t]), 15, 'ties = 8+4+2+1');
  eq(await count(`select 1 from tournament_ties where tournament_id = $1 and round_no = 1 and match_id is not null`, [t]), 8, 'round 1 matches');
  eq(await count(`select distinct seed from tournament_pairs where tournament_id = $1`, [t]), 16, 'distinct seeds');
});

test('cancelling a tournament: only the organizer, pairs are told, registration closes', async () => {
  const t = await newTournament(ORG, 8);
  await register(t, P[9], P[10]);
  await expectErr(() => as(P[9], `select cancel_tournament($1)`, [t]), 'not_organizer');
  await as(ORG, `select cancel_tournament($1)`, [t]);
  eq((await su(`select status from tournaments where id = $1`, [t])).rows[0].status, 'cancelled', 'cancelled');
  eq(await notifs(P[10], 'tournament_cancelled'), 1, 'partner told');
  await expectErr(() => as(P[11], `select register_pair($1, $2)`, [t, P[12].id]), 'registration_closed');
  await expectErr(() => as(ORG, `select cancel_tournament($1)`, [t]), 'tournament_closed');
});

test('deleting an account anonymises the player and frees future matches', async () => {
  const hosted = await createMatch(P[14], 'Court 9');
  const other = await createMatch(P[15], 'Court 8');
  await as(P[14], `select join_match($1)`, [other]);
  await as(P[14], `select delete_account()`);
  eq((await su(`select status from matches where id = $1`, [hosted])).rows[0].status, 'cancelled', 'hosted cancelled');
  eq(await count(`select 1 from match_players where match_id = $1 and player_id = $2 and status = 'joined'`, [other, P[14].id]), 0, 'left the other match');
  const p = (await su(`select display_name, is_deleted from profiles where id = $1`, [P[14].id])).rows[0];
  eq(p.display_name, 'Deleted player', 'name'); eq(p.is_deleted, true, 'flag');
  const rows = (await as(P[15], `select player_id from ranking()`)).rows;
  assert(!rows.some(r => r.player_id === P[14].id), 'not in ranking');
});

test('the host confirms a pending result after 7 days, not before, and not a disputed one', async () => {
  const [h, b, c, d] = [P[9], P[10], P[11], P[12]];
  const m = await fullMatch([h, b, c, d]);                                  // h and b are team A
  await as(c, `select submit_result($1, $2)`, [m, JSON.stringify(B_WINS)]); // team B (c, d) wins
  await expectErr(() => as(h, `select host_confirm_result($1)`, [m]), 'too_early');
  await su(`update match_results set created_at = now() - interval '6 days 23 hours' where match_id = $1`, [m]);
  await expectErr(() => as(h, `select host_confirm_result($1)`, [m]), 'too_early');
  await su(`update match_results set created_at = now() - interval '8 days' where match_id = $1`, [m]);
  await expectErr(() => as(b, `select host_confirm_result($1)`, [m]), 'not_host');
  const before = await level(c);
  await as(h, `select host_confirm_result($1)`, [m]);
  eq((await su(`select status from matches where id = $1`, [m])).rows[0].status, 'played', 'played');
  assert(await level(c) > before, 'winner level went up');
  eq(await count(`select 1 from rating_changes where match_id = $1`, [m]), 4, 'rating rows');
  eq(await count(`select 1 from notifications where player_id = $1 and type = 'result_confirmed' and payload->>'match_id' = $2`, [c.id, m]), 1, 'submitter told');
  await expectErr(() => as(h, `select host_confirm_result($1)`, [m]), 'nothing_to_confirm');
  // a disputed result needs a new submission, even after 7 days
  const m2 = await fullMatch([h, b, c, d]);
  await as(c, `select submit_result($1, $2)`, [m2, JSON.stringify(B_WINS)]);
  await as(h, `select dispute_result($1)`, [m2]);
  await su(`update match_results set created_at = now() - interval '8 days' where match_id = $1`, [m2]);
  await expectErr(() => as(h, `select host_confirm_result($1)`, [m2]), 'nothing_to_confirm');
});

test('an organizer who deletes their account hands the tournament to a registered player', async () => {
  // still in registration, one pair confirmed: the earliest registered player takes over
  const org3 = await signup('Organizer 3');
  const t3 = await newTournament(org3, 8);
  await accept(await register(t3, P[9], P[10]), P[10]);
  await as(org3, `select delete_account()`);
  const o3 = (await su(`select organizer_id, status from tournaments where id = $1`, [t3])).rows[0];
  eq(o3.organizer_id, P[9].id, 'new organizer'); eq(o3.status, 'registration', 'still open');
  eq(await notifs(P[9], 'tournament_organizer_assigned'), 1, 'told');

  // still in registration and nobody registered (only a pending invite): cancelled
  const org4 = await signup('Organizer 4');
  const t4 = await newTournament(org4, 8);
  await register(t4, P[11], P[12]);
  await as(org4, `select delete_account()`);
  eq((await su(`select status from tournaments where id = $1`, [t4])).rows[0].status, 'cancelled', 'cancelled');

  // running tournament: the organizer role and the matches' host move together
  const org2 = await signup('Organizer 2');
  const t2 = await newTournament(org2, 8);
  const ps = [P[0], P[1], P[2], P[3], P[4], P[5], P[6], P[7]];
  for (let i = 0; i < 4; i++) await accept(await register(t2, ps[2 * i], ps[2 * i + 1]), ps[2 * i + 1]);
  eq((await su(`select status from tournaments where id = $1`, [t2])).rows[0].status, 'in_progress', 'running');
  await as(org2, `select delete_account()`);
  const o2 = (await su(`select organizer_id, status from tournaments where id = $1`, [t2])).rows[0];
  eq(o2.organizer_id, P[0].id, 'earliest registered player'); eq(o2.status, 'in_progress', 'still running');
  eq(await count(`select 1 from matches where tournament_id = $1 and host_id = $2`, [t2, P[0].id]), 2, 'matches follow the organizer');
  eq(await count(`select 1 from matches where tournament_id = $1 and host_id = $2`, [t2, org2.id]), 0, 'none left on the old one');
  eq(await notifs(P[0], 'tournament_organizer_assigned'), 1, 'new organizer told');
  // the new organizer settles a tie they are not in; a plain player cannot
  const other = (await su(`select t.match_id from tournament_ties t
    where t.tournament_id = $1 and t.round_no = 1
      and not exists (select 1 from match_players mp where mp.match_id = t.match_id and mp.player_id = $2)`, [t2, P[0].id])).rows[0].match_id;
  await expectErr(() => as(P[7], `select organizer_set_result($1, $2)`, [other, JSON.stringify(A_WINS)]), 'not_organizer');
  await as(P[0], `select organizer_set_result($1, $2)`, [other, JSON.stringify(A_WINS)]);
  eq(await count(`select 1 from tournament_ties where tournament_id = $1 and winner_pair_id is not null`, [t2]), 1, 'winner advanced');
  eq((await su(`select is_deleted from profiles where id = $1`, [org2.id])).rows[0].is_deleted, true, 'old organizer anonymised');
});


test('create_match validates every field on the server and caps open matches per host', async () => {
  const u = await signup('Spammer');
  const call = (start, dur, place, type, min, max) => as(u, `select create_match(${start}, $1, $2, $3, $4, $5)`, [dur, place, type, min, max]);
  await expectErr(() => call(`now() - interval '1 hour'`, 90, 'Court 1', 'competitive', 1, 10), 'starts_in_past');
  await expectErr(() => call(`now() + interval '1 day'`, 90, ' ', 'competitive', 1, 10), 'invalid_place');
  await expectErr(() => call(`now() + interval '1 day'`, 20, 'Court 1', 'competitive', 1, 10), 'invalid_duration');
  await expectErr(() => call(`now() + interval '1 day'`, 90, 'Court 1', 'competitive', 6, 4), 'invalid_level_range');
  for (let i = 0; i < 5; i++) await createMatch(u, `Court ${i + 1}`);
  await expectErr(() => createMatch(u, 'Court 6'), 'too_many_open');
});

test('create_tournament validates and caps tournaments taking entries per organizer', async () => {
  const u = await signup('Organizer cap');
  const make = (name) => as(u, `select create_tournament($1, '', 'Court 1', now() + interval '3 days', 8, 7)`, [name]);
  await expectErr(() => make('x'), 'invalid_name');
  await make('Cup one');
  await make('Cup two');
  await expectErr(() => make('Cup three'), 'too_many_open');
});

test('notifications say what they are about and who caused them', async () => {
  const host = await signup('Host N');
  const guest = await signup('Guest N');
  const m = await createMatch(host, 'Court 4');
  await as(guest, `select join_match($1)`, [m]);
  const n = (await su(`select match_id, tournament_id, actor_id from notifications where player_id = $1 and type = 'player_joined'`, [host.id])).rows[0];
  eq(n.match_id, m, 'match'); eq(n.actor_id, guest.id, 'actor'); eq(n.tournament_id, null, 'no tournament');
  const t = (await as(host, `select create_tournament('Note Cup', '', 'Court 1', now() + interval '3 days', 8, 7) as id`)).rows[0].id;
  await as(host, `select register_pair($1, $2)`, [t, guest.id]);
  const inv = (await su(`select tournament_id, actor_id from notifications where player_id = $1 and type = 'tournament_pair_invite'`, [guest.id])).rows[0];
  eq(inv.tournament_id, t, 'tournament'); eq(inv.actor_id, host.id, 'inviter');
});

test('a second user gets nothing back: notifications and push tokens are private', async () => {
  const a = await signup('Private A');
  const b = await signup('Private B');
  const m = await createMatch(a, 'Court 5');
  await as(b, `select join_match($1)`, [m]); // gives A a notification
  eq((await as(a, `select count(*)::int c from notifications`)).rows[0].c >= 1, true, 'A sees hers');
  eq((await as(b, `select count(*)::int c from notifications where player_id = $1`, [a.id])).rows[0].c, 0, 'B sees none of A');
  const upd = await as(b, `update notifications set read_at = now() where player_id = $1`, [a.id]);
  eq(upd.affectedRows ?? 0, 0, 'B cannot mark A read');
  await as(a, `insert into push_tokens (token, player_id, platform) values ('ExponentPushToken[a]', $1, 'ios')`, [a.id]);
  eq((await as(b, `select count(*)::int c from push_tokens`)).rows[0].c, 0, 'B sees no tokens');
  await expectErr(() => as(b, `insert into push_tokens (token, player_id, platform) values ('ExponentPushToken[b]', $1, 'ios')`, [a.id]), 'row-level security');
  await expectErr(() => as(b, `update notifications set pushed_at = now() where player_id = $1`, [b.id]), 'permission denied');
});

test('claim_pushes hands each notification out once, with locale, actor and tokens; members cannot call it', async () => {
  // earlier tests left unsent notifications; claim them first so this test starts clean
  await su(`select count(*) from claim_pushes(100000)`);
  const a = await signup('Push A', 'en');
  const b = await signup('Push B');
  await as(a, `insert into push_tokens (token, player_id, platform) values ('ExponentPushToken[push-a]', $1, 'android')`, [a.id]);
  const m = await createMatch(a, 'Court 7');
  await as(b, `select join_match($1)`, [m]);
  const first = (await su(`select * from claim_pushes(50)`)).rows;
  const mine = first.find((r) => r.player_id === a.id);
  assert(mine, 'A has a push to send');
  eq(mine.type, 'player_joined', 'type'); eq(mine.locale, 'en', 'locale'); eq(mine.actor_name, 'Push B', 'actor name');
  eq(mine.tokens.join(','), 'ExponentPushToken[push-a]', 'tokens');
  eq((await su(`select count(*)::int c from claim_pushes(50)`)).rows[0].c, 0, 'nothing twice');
  await expectErr(() => as(a, `select * from claim_pushes(10)`), 'permission denied');
});

// ---------------------------------------------------------------- run
let failed = 0;
for (const [name, fn] of tests) {
  try { await fn(); console.log(`PASS  ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); }
}
console.log(`\n${tests.length - failed} of ${tests.length} passed`);
process.exit(failed ? 1 : 0);
