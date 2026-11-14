// The real data layer: Supabase behind the same Api the fake layer implements.
// Reads go through row level security; every change is one of the SQL functions
// in supabase/migrations (create_match, join_match, submit_result...), which
// check the rules on the server and raise the error codes in ../errors.ts.
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Api } from '../api';
import { ApiError, toApiError, type ErrorCode } from '../errors';
import type {
  AppNotification,
  Id,
  Match,
  MatchPlayer,
  MatchResult,
  NotificationType,
  Profile,
  RankingEntry,
  Tournament,
  TournamentPair,
  TournamentTie,
} from '../types';

import { createSupabase } from './client';

// ---------------------------------------------------------------- rows

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  hand: Profile['hand'];
  court_side: Profile['courtSide'];
  level: number | string;
  reliability: number | string;
  locale: Profile['locale'];
  is_deleted: boolean;
  created_at: string;
}

interface MatchRow {
  id: string;
  host_id: string;
  starts_at: string;
  duration_minutes: number;
  place: string;
  type: Match['type'];
  level_min: number | string;
  level_max: number | string;
  notes: string | null;
  status: Match['status'];
  tournament_id: string | null;
  created_at: string;
  match_players: { player_id: string; slot: number | null; status: MatchPlayer['status'] }[];
  match_results:
    | { submitted_by: string; winner_team: 'A' | 'B'; status: MatchResult['status']; confirmed_by: string | null; created_at: string }
    | { submitted_by: string; winner_team: 'A' | 'B'; status: MatchResult['status']; confirmed_by: string | null; created_at: string }[]
    | null;
  set_scores: { set_number: number; team_a_games: number; team_b_games: number }[];
}

interface TournamentRow {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  place: string;
  starts_at: string;
  max_pairs: 4 | 8 | 16;
  round_days: number;
  status: Tournament['status'];
  champion_pair_id: string | null;
  created_at: string;
  tournament_pairs: { id: string; player1_id: string; player2_id: string; status: TournamentPair['status']; seed: number | null; created_at: string }[];
  tournament_ties: { id: string; round_no: number; pos: number; pair_a_id: string | null; pair_b_id: string | null; match_id: string | null; winner_pair_id: string | null }[];
}

const PROFILE = 'id, display_name, avatar_url, city, hand, court_side, level, reliability, locale, is_deleted, created_at';
const MATCH =
  'id, host_id, starts_at, duration_minutes, place, type, level_min, level_max, notes, status, tournament_id, created_at,' +
  ' match_players(player_id, slot, status),' +
  ' match_results(submitted_by, winner_team, status, confirmed_by, created_at),' +
  ' set_scores(set_number, team_a_games, team_b_games)';
const TOURNAMENT = '*, tournament_pairs(*), tournament_ties(*)';

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
  city: r.city,
  hand: r.hand,
  courtSide: r.court_side,
  level: Number(r.level),
  reliability: Number(r.reliability),
  locale: r.locale,
  isDeleted: r.is_deleted,
  createdAt: r.created_at,
});

function toMatch(r: MatchRow): Match {
  const result = Array.isArray(r.match_results) ? r.match_results[0] : r.match_results;
  const sets = [...(r.set_scores ?? [])].sort((a, b) => a.set_number - b.set_number).map((s) => ({ a: s.team_a_games, b: s.team_b_games }));
  return {
    id: r.id,
    hostId: r.host_id,
    startsAt: r.starts_at,
    durationMinutes: r.duration_minutes,
    place: r.place,
    type: r.type,
    levelMin: Number(r.level_min),
    levelMax: Number(r.level_max),
    notes: r.notes,
    status: r.status,
    tournamentId: r.tournament_id,
    players: (r.match_players ?? []).map((p) => ({ playerId: p.player_id, slot: p.slot as MatchPlayer['slot'], status: p.status })),
    result: result
      ? {
          submittedBy: result.submitted_by,
          winnerTeam: result.winner_team,
          status: result.status,
          confirmedBy: result.confirmed_by,
          createdAt: result.created_at,
          sets,
        }
      : null,
    createdAt: r.created_at,
  };
}

const toTournament = (r: TournamentRow): Tournament => ({
  id: r.id,
  organizerId: r.organizer_id,
  name: r.name,
  description: r.description,
  place: r.place,
  startsAt: r.starts_at,
  maxPairs: r.max_pairs,
  roundDays: r.round_days,
  status: r.status,
  championPairId: r.champion_pair_id,
  pairs: (r.tournament_pairs ?? []).map((p) => ({ id: p.id, player1Id: p.player1_id, player2Id: p.player2_id, status: p.status, seed: p.seed, createdAt: p.created_at })),
  ties: (r.tournament_ties ?? []).map(
    (x): TournamentTie => ({ id: x.id, roundNo: x.round_no, pos: x.pos, pairAId: x.pair_a_id, pairBId: x.pair_b_id, matchId: x.match_id, winnerPairId: x.winner_pair_id }),
  ),
  createdAt: r.created_at,
});

// ---------------------------------------------------------------- errors

// Supabase Auth reports its own codes; map them to the app's.
const AUTH_CODES: Record<string, ErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  user_already_exists: 'email_taken',
  email_exists: 'email_taken',
  email_not_confirmed: 'email_not_confirmed',
  otp_expired: 'invalid_code',
  over_email_send_rate_limit: 'rate_limited',
  over_request_rate_limit: 'rate_limited',
  weak_password: 'weak_password',
  email_address_invalid: 'invalid_email',
  validation_failed: 'invalid_email',
};

function fail(error: unknown): never {
  const e = error as { code?: string; message?: string; status?: number; name?: string };
  if (e?.code && AUTH_CODES[e.code]) throw new ApiError(AUTH_CODES[e.code]);
  if (e?.status === 429) throw new ApiError('rate_limited');
  // a fetch that never reached the server
  if (e?.name === 'TypeError' || /network request failed|failed to fetch/i.test(e?.message ?? '')) throw new ApiError('network');
  // SQL functions raise the code itself as the message (raise exception 'match_full')
  throw toApiError(new Error(e?.message ?? String(error)));
}

function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) fail(res.error);
  return res.data;
}

const clean = (q: string) => q.replace(/[%_\\,()]/g, ' ').trim();

// ---------------------------------------------------------------- api

export function createSupabaseApi(url: string, publishableKey: string): Api {
  const sb: SupabaseClient = createSupabase(url, publishableKey);
  const listeners = new Set<() => void>();
  let profileId: Id | null = null;
  let ready = false;

  const emit = () => listeners.forEach((l) => l());

  /** the signed-in login's player id (profiles.id is not the auth user id) */
  async function loadProfileId(authId: string | undefined) {
    if (!authId) {
      profileId = null;
      return;
    }
    const { data } = await sb.from('profiles').select('id').eq('auth_id', authId).maybeSingle();
    profileId = (data as { id: string } | null)?.id ?? null;
  }

  // read a stored session at start-up, then follow sign-in, sign-out and expiry
  sb.auth.getSession().then(async ({ data }) => {
    await loadProfileId(data.session?.user.id);
    ready = true;
    emit();
  });
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    // never await inside this callback (Supabase docs); load the profile id after it returns
    setTimeout(async () => {
      await loadProfileId(session?.user.id);
      emit();
    }, 0);
  });

  function me(): Id {
    if (!profileId) throw new ApiError('not_authenticated');
    return profileId;
  }

  /** run an SQL function, then tell open screens that data changed */
  async function call<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
    const data = check(await sb.rpc(fn, args));
    emit();
    return data as T;
  }

  async function matchIdsOf(playerId: Id, statuses: MatchPlayer['status'][]): Promise<Id[]> {
    const rows = check(await sb.from('match_players').select('match_id').eq('player_id', playerId).in('status', statuses));
    return (rows as { match_id: string }[]).map((r) => r.match_id);
  }

  const matchQuery = () => sb.from('matches').select(MATCH);
  type MatchQuery = ReturnType<typeof matchQuery>;

  async function matchesById(ids: Id[], filter: (q: MatchQuery) => MatchQuery, ascending: boolean): Promise<Match[]> {
    if (!ids.length) return [];
    const rows = check(await filter(matchQuery().in('id', ids)).order('starts_at', { ascending }));
    return (rows as unknown as MatchRow[]).map(toMatch);
  }

  const api: Api = {
    auth: {
      async signUp({ email, password, displayName, locale }) {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim(), locale } },
        });
        if (error) fail(error);
        // with "Confirm email" on, there is no session until the emailed code is entered
        return { needsConfirmation: !data.session };
      },
      async verifySignUp(email, code) {
        let res = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'signup' });
        if (res.error) res = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (res.error) fail(res.error);
      },
      async resendSignUpCode(email) {
        const { error } = await sb.auth.resend({ type: 'signup', email: email.trim() });
        if (error) fail(error);
      },
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) fail(error);
        await loadProfileId(data.user?.id);
        emit();
        return me();
      },
      async signOut(everywhere = false) {
        const { error } = await sb.auth.signOut({ scope: everywhere ? 'global' : 'local' });
        if (error) fail(error);
        profileId = null;
        emit();
      },
      async requestPasswordReset(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim());
        if (error) fail(error);
      },
      async resetPassword(email, code, newPassword) {
        const verified = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
        if (verified.error) fail(verified.error);
        const { error } = await sb.auth.updateUser({ password: newPassword });
        if (error) fail(error);
        await loadProfileId(verified.data.user?.id);
        emit();
      },
      currentUserId: () => profileId,
      isReady: () => ready,
    },

    async deleteAccount() {
      me();
      const { error } = await sb.functions.invoke('delete-user', { method: 'POST' });
      if (error) fail(error);
      await sb.auth.signOut({ scope: 'local' });
      profileId = null;
      emit();
    },

    async registerPushToken(token, platform) {
      const { error } = await sb.from('push_tokens').upsert({ token, player_id: me(), platform }, { onConflict: 'token' });
      // a token still owned by another account on this phone is not ours to take over; ignore it
      if (error) console.warn('push token not saved', error.message);
    },

    async getProfile(id) {
      const row = check(await sb.from('profiles').select(PROFILE).eq('id', id).maybeSingle());
      if (!row) throw new ApiError('not_allowed');
      return toProfile(row as ProfileRow);
    },

    async getProfiles(ids) {
      if (!ids.length) return [];
      const rows = check(await sb.from('profiles').select(PROFILE).in('id', ids));
      return (rows as ProfileRow[]).map(toProfile);
    },

    async updateProfile(update) {
      const patch: Record<string, unknown> = {};
      if (update.displayName !== undefined) {
        const name = update.displayName.trim();
        if (name.length < 1 || name.length > 40) throw new ApiError('invalid_name');
        patch.display_name = name;
      }
      if (update.city !== undefined) patch.city = update.city?.trim() || null;
      if (update.hand !== undefined) patch.hand = update.hand;
      if (update.courtSide !== undefined) patch.court_side = update.courtSide;
      if (update.locale !== undefined) patch.locale = update.locale;
      const row = check(await sb.from('profiles').update(patch).eq('id', me()).select(PROFILE).single());
      emit();
      return toProfile(row as ProfileRow);
    },

    async searchPlayers(query) {
      const q = clean(query);
      let req = sb.from('profiles').select(PROFILE).eq('is_deleted', false).neq('id', me()).order('display_name').limit(50);
      if (q) req = req.ilike('display_name', `%${q}%`);
      return (check(await req) as ProfileRow[]).map(toProfile);
    },

    async listOpenMatches() {
      me();
      const rows = check(
        await sb.from('matches').select(MATCH).eq('status', 'open').is('tournament_id', null).gt('starts_at', new Date().toISOString()).order('starts_at'),
      );
      return (rows as unknown as MatchRow[]).map(toMatch);
    },

    async listMyUpcomingMatches() {
      const ids = await matchIdsOf(me(), ['joined', 'requested']);
      return matchesById(ids, (q) => q.in('status', ['open', 'full']).gt('starts_at', new Date().toISOString()), true);
    },

    async listMyRecentMatches() {
      const ids = await matchIdsOf(me(), ['joined']);
      return matchesById(ids, (q) => q.neq('status', 'cancelled').lte('starts_at', new Date().toISOString()), false);
    },

    async listPlayerRecentMatches(playerId) {
      me();
      const ids = await matchIdsOf(playerId, ['joined']);
      return matchesById(ids, (q) => q.neq('status', 'cancelled').lte('starts_at', new Date().toISOString()), false);
    },

    async getMatch(id) {
      me();
      const row = check(await sb.from('matches').select(MATCH).eq('id', id).maybeSingle());
      if (!row) throw new ApiError('match_not_found');
      return toMatch(row as unknown as MatchRow);
    },

    async createMatch(input) {
      return call<Id>('create_match', {
        p_starts_at: input.startsAt,
        p_duration_minutes: input.durationMinutes,
        p_place: input.place,
        p_type: input.type,
        p_level_min: input.levelMin,
        p_level_max: input.levelMax,
        p_notes: input.notes ?? null,
      });
    },
    joinMatch: (id) => call<'joined' | 'requested'>('join_match', { p_match: id }),
    acceptRequest: (matchId, playerId) => call('accept_request', { p_match: matchId, p_player: playerId }).then(() => undefined),
    leaveMatch: (id) => call('leave_match', { p_match: id }).then(() => undefined),
    cancelMatch: (id) => call('cancel_match', { p_match: id }).then(() => undefined),

    submitResult: (matchId, sets) => call('submit_result', { p_match: matchId, p_sets: sets }).then(() => undefined),
    confirmResult: (matchId) => call('confirm_result', { p_match: matchId }).then(() => undefined),
    disputeResult: (matchId) => call('dispute_result', { p_match: matchId }).then(() => undefined),
    hostConfirmResult: (matchId) => call('host_confirm_result', { p_match: matchId }).then(() => undefined),

    async ranking(since) {
      me();
      const rows = check(await sb.rpc('ranking', { p_since: since ? since.toISOString() : null }));
      return (rows as { player_id: string; display_name: string; avatar_url: string | null; level: number; played: number; won: number; lost: number; win_rate: number }[]).map(
        (r): RankingEntry => ({
          playerId: r.player_id,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          level: Number(r.level),
          played: Number(r.played),
          won: Number(r.won),
          lost: Number(r.lost),
          winRate: Number(r.win_rate),
        }),
      );
    },

    async listTournaments() {
      me();
      const rows = check(await sb.from('tournaments').select(TOURNAMENT).order('starts_at'));
      return (rows as unknown as TournamentRow[]).map(toTournament);
    },

    async getTournament(id) {
      me();
      const row = check(await sb.from('tournaments').select(TOURNAMENT).eq('id', id).maybeSingle());
      if (!row) throw new ApiError('tournament_not_found');
      return toTournament(row as unknown as TournamentRow);
    },

    createTournament: (input) =>
      call<Id>('create_tournament', {
        p_name: input.name,
        p_description: input.description ?? '',
        p_place: input.place,
        p_starts_at: input.startsAt,
        p_players: input.players,
        p_round_days: input.roundDays,
      }),
    registerPair: (tournamentId, partnerId) => call<Id>('register_pair', { p_tournament: tournamentId, p_partner: partnerId }),
    respondPairInvite: (pairId, accept) => call('respond_pair_invite', { p_pair: pairId, p_accept: accept }).then(() => undefined),
    withdrawPair: (pairId) => call('withdraw_pair', { p_pair: pairId }).then(() => undefined),
    cancelTournament: (id) => call('cancel_tournament', { p_tournament: id }).then(() => undefined),
    organizerSetResult: (matchId, sets) => call('organizer_set_result', { p_match: matchId, p_sets: sets }).then(() => undefined),

    async listNotifications() {
      me();
      const rows = check(
        await sb.from('notifications').select('id, type, match_id, tournament_id, actor_id, read_at, created_at').order('created_at', { ascending: false }).limit(100),
      );
      return (rows as { id: string; type: NotificationType; match_id: string | null; tournament_id: string | null; actor_id: string | null; read_at: string | null; created_at: string }[]).map(
        (n): AppNotification => ({
          id: n.id,
          type: n.type,
          matchId: n.match_id,
          tournamentId: n.tournament_id,
          actorId: n.actor_id,
          readAt: n.read_at,
          createdAt: n.created_at,
        }),
      );
    },

    async markNotificationsRead() {
      check(await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('player_id', me()).is('read_at', null));
      emit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return api;
}
