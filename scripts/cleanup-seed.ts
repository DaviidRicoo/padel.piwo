/// <reference types="node" />
// Removes everything scripts/seed-supabase.ts created: the @padelpiwo.test
// accounts, their profiles, and every match, result, tournament and notification
// they are part of. Real accounts are left alone (a real player's notification
// that names a seed player just loses the name, by "on delete set null").
//
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... CLEANUP_CONFIRM=yes \
//     node scripts/cleanup-seed.ts
import { createClient } from '@supabase/supabase-js';

const SEED_DOMAIN = '@padelpiwo.test';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  process.exit(2);
}
if (process.env.CLEANUP_CONFIRM !== 'yes') {
  console.error(`This deletes every ${SEED_DOMAIN} account and its data. Set CLEANUP_CONFIRM=yes to go ahead.`);
  process.exit(2);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

function ok<R extends { data: unknown; error: unknown }>(res: R, what: string): R['data'] {
  if (res.error) throw new Error(`${what}: ${(res.error as { message?: string }).message ?? String(res.error)}`);
  return res.data;
}

const ids = (rows: unknown) => (rows as { id: string }[]).map((r) => r.id);
const uniq = (xs: string[]) => [...new Set(xs)];

async function main() {
  const users = ok(await db.auth.admin.listUsers({ page: 1, perPage: 1000 }), 'list users').users.filter((u) => u.email?.endsWith(SEED_DOMAIN));
  if (!users.length) {
    console.log(`No ${SEED_DOMAIN} accounts: nothing to clean.`);
    return;
  }
  const authIds = users.map((u) => u.id);
  const seedProfiles = ids(ok(await db.from('profiles').select('id').in('auth_id', authIds), 'profiles'));
  console.log(`seed accounts: ${users.length}, profiles: ${seedProfiles.length}`);

  // every tournament a seed player organises or plays in
  const organised = ids(ok(await db.from('tournaments').select('id').in('organizer_id', seedProfiles), 'organised'));
  const pairRows = (ok(
    await db.from('tournament_pairs').select('tournament_id').or(`player1_id.in.(${seedProfiles.join(',')}),player2_id.in.(${seedProfiles.join(',')})`),
    'pairs',
  ) ?? []) as { tournament_id: string }[];
  const tournaments = uniq([...organised, ...pairRows.map((p) => p.tournament_id)]);

  // every match a seed player hosts or plays in, plus the matches of those tournaments
  const hosted = ids(ok(await db.from('matches').select('id').in('host_id', seedProfiles), 'hosted'));
  const played = ((ok(await db.from('match_players').select('match_id').in('player_id', seedProfiles), 'played') ?? []) as { match_id: string }[]).map((r) => r.match_id);
  const ofTournaments = tournaments.length ? ids(ok(await db.from('matches').select('id').in('tournament_id', tournaments), 'tournament matches')) : [];
  const matches = uniq([...hosted, ...played, ...ofTournaments]);
  console.log(`tournaments: ${tournaments.length}, matches: ${matches.length}`);

  // the foreign keys are "restrict" both ways between ties and matches, so: ties, then matches, then tournaments
  if (tournaments.length) {
    ok(await db.from('tournaments').update({ champion_pair_id: null, status: 'cancelled' }).in('id', tournaments), 'unset champions');
    ok(await db.from('tournament_ties').delete().in('tournament_id', tournaments), 'ties');
  }
  // in chunks, to keep request URLs short; results, sets, players, ratings and notifications cascade
  for (let i = 0; i < matches.length; i += 50) ok(await db.from('matches').delete().in('id', matches.slice(i, i + 50)), 'matches');
  if (tournaments.length) ok(await db.from('tournaments').delete().in('id', tournaments), 'tournaments');

  // profiles (follows, notifications and push tokens cascade), then the logins
  ok(await db.from('profiles').delete().in('id', seedProfiles), 'profiles');
  for (const u of users) ok(await db.auth.admin.deleteUser(u.id), `delete ${u.email}`);
  console.log('done: every seed account and its data is gone');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
