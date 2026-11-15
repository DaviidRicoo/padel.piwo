/// <reference types="node" />
// Fills a TEST Supabase project with the same invented residents, matches and
// tournaments the fake data layer uses (src/data/fake/seed.ts), so the real
// backend can be tried and tested. Never run it against the residence's project.
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... SEED_CONFIRM=yes \
//     node scripts/seed-supabase.ts
//
// The secret key bypasses row level security; it is read from the shell only,
// never stored in a file of the app. Every seed account signs in with the
// password in seed.ts (e.g. ana@padelpiwo.test).
import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

import { buildSeed } from '../src/data/fake/seed.ts';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (the secret key of a TEST project).');
  process.exit(2);
}
if (process.env.SEED_CONFIRM !== 'yes') {
  console.error('This writes invented players into the project. Set SEED_CONFIRM=yes to confirm it is a test project.');
  process.exit(2);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const seed = buildSeed(new Date());

// generic over the whole response, so Supabase's success | error unions keep their data type
function ok<R extends { data: unknown; error: unknown }>(res: R, what: string): R['data'] {
  if (res.error) throw new Error(`${what}: ${(res.error as { message?: string }).message ?? String(res.error)}`);
  return res.data;
}

async function main() {
  // refuse to seed twice: the seed emails must not exist yet
  const existing = ok(await db.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'list users').users.map((u) => u.email);
  const clash = seed.accounts.find((a) => existing.includes(a.email));
  if (clash) throw new Error(`${clash.email} already exists: this project looks seeded already.`);

  // 1. accounts; the handle_new_user trigger creates each profile
  const profileId = new Map<string, string>();
  for (const acc of seed.accounts) {
    const prof = seed.profiles.find((p) => p.id === acc.profileId)!;
    const created = ok(
      await db.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { display_name: prof.displayName, locale: prof.locale },
      }),
      `create ${acc.email}`,
    );
    const row = ok(await db.from('profiles').select('id').eq('auth_id', created.user!.id).single(), 'profile');
    profileId.set(prof.id, (row as { id: string }).id);
    // starting levels as if from the questionnaire; matches move them below
    ok(
      await db.from('profiles').update({ city: prof.city, hand: prof.hand, court_side: prof.courtSide, level: prof.level }).eq('id', (row as { id: string }).id),
      'profile details',
    );
  }
  const pid = (id: string) => profileId.get(id)!;
  console.log(`accounts: ${profileId.size}`);

  // 2. tournaments and pairs (champions after the ties exist)
  const tournamentId = new Map(seed.tournaments.map((t) => [t.id, randomUUID()]));
  const pairId = new Map(seed.tournaments.flatMap((t) => t.pairs.map((p) => [p.id, randomUUID()] as const)));
  for (const t of seed.tournaments) {
    ok(
      await db.from('tournaments').insert({
        id: tournamentId.get(t.id),
        organizer_id: pid(t.organizerId),
        name: t.name,
        description: t.description,
        place: t.place,
        starts_at: t.startsAt,
        max_pairs: t.maxPairs,
        round_days: t.roundDays,
        status: t.status,
        created_at: t.createdAt,
      }),
      `tournament ${t.name}`,
    );
    for (const p of t.pairs) {
      ok(
        await db.from('tournament_pairs').insert({
          id: pairId.get(p.id),
          tournament_id: tournamentId.get(t.id),
          player1_id: pid(p.player1Id),
          player2_id: pid(p.player2Id),
          status: p.status,
          seed: p.seed,
          created_at: p.createdAt,
        }),
        'pair',
      );
    }
  }

  // 3. matches, players, results and sets
  const matchId = new Map(seed.matches.map((m) => [m.id, randomUUID()]));
  for (const m of seed.matches) {
    const id = matchId.get(m.id)!;
    ok(
      await db.from('matches').insert({
        id,
        host_id: pid(m.hostId),
        starts_at: m.startsAt,
        duration_minutes: m.durationMinutes,
        place: m.place,
        type: m.type,
        level_min: m.levelMin,
        level_max: m.levelMax,
        notes: m.notes,
        status: m.status,
        tournament_id: m.tournamentId ? tournamentId.get(m.tournamentId) : null,
        created_at: m.createdAt,
      }),
      'match',
    );
    // the host_joins_match trigger already put the host in slot 1 of normal matches
    ok(
      await db.from('match_players').upsert(
        m.players.map((p) => ({ match_id: id, player_id: pid(p.playerId), slot: p.slot, status: p.status })),
        { onConflict: 'match_id,player_id' },
      ),
      'players',
    );
    if (m.result) {
      ok(
        await db.from('match_results').insert({
          match_id: id,
          submitted_by: pid(m.result.submittedBy),
          winner_team: m.result.winnerTeam,
          status: m.result.status,
          confirmed_by: m.result.confirmedBy ? pid(m.result.confirmedBy) : null,
          created_at: m.result.createdAt,
        }),
        'result',
      );
      ok(
        await db.from('set_scores').insert(m.result.sets.map((s, i) => ({ match_id: id, set_number: i + 1, team_a_games: s.a, team_b_games: s.b }))),
        'sets',
      );
    }
  }
  console.log(`matches: ${matchId.size}`);

  // 4. bracket ties and champions
  for (const t of seed.tournaments) {
    for (const x of t.ties) {
      ok(
        await db.from('tournament_ties').insert({
          tournament_id: tournamentId.get(t.id),
          round_no: x.roundNo,
          pos: x.pos,
          pair_a_id: x.pairAId ? pairId.get(x.pairAId) : null,
          pair_b_id: x.pairBId ? pairId.get(x.pairBId) : null,
          match_id: x.matchId ? matchId.get(x.matchId) : null,
          winner_pair_id: x.winnerPairId ? pairId.get(x.winnerPairId) : null,
        }),
        'tie',
      );
    }
    if (t.championPairId) {
      ok(await db.from('tournaments').update({ champion_pair_id: pairId.get(t.championPairId) }).eq('id', tournamentId.get(t.id)), 'champion');
    }
  }

  // 5. levels: replay the confirmed competitive matches in order, with the same SQL the app uses
  const rated = seed.matches.filter((m) => m.type === 'competitive' && m.result?.status === 'confirmed').sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const m of rated) ok(await db.rpc('apply_ratings', { p_match: matchId.get(m.id) }), 'ratings');
  console.log(`rated matches: ${rated.length}`);

  // 6. a few notifications for Ana, already marked as pushed so the seed sends no pushes
  ok(
    await db.from('notifications').insert(
      seed.notifications.map((n) => ({
        player_id: pid(n.playerId),
        type: n.type,
        match_id: n.matchId ? matchId.get(n.matchId) : null,
        tournament_id: n.tournamentId ? tournamentId.get(n.tournamentId) : null,
        actor_id: n.actorId ? pid(n.actorId) : null,
        read_at: n.readAt,
        created_at: n.createdAt,
        pushed_at: new Date().toISOString(),
      })),
    ),
    'notifications',
  );
  console.log('done: sign in as ana@padelpiwo.test with the seed password');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
