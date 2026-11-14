// In-memory data layer with the same rules as supabase/migrations/20261114000100_schema.sql. Used until
// /replica-backend swaps in Supabase. State lives in memory: a reload resets it.
import type { Api } from '../api';
import { ApiError } from '../errors';
import { freeSlots, HOST_CONFIRM_AFTER_DAYS, LEVEL_MAX, LEVEL_MIN, livePairOf, ratingDeltas, roundsFor, teamOfPlayer, TOURNAMENT_SIZES, winnerOf } from '../rules';
import {
  teamOf,
  type AppNotification,
  type Id,
  type Match,
  type NotificationType,
  type Profile,
  type RankingEntry,
  type Tournament,
  type TournamentPair,
  type TournamentTie,
} from '../types';

import { buildSeed, type SeedAccount, type SeedState } from './seed';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export interface FakeApiOptions {
  latencyMs?: number;
  /** email of a seed account to start signed in as (screenshots, demos) */
  demoEmail?: string;
  now?: () => Date;
}

export function createFakeApi(opts: FakeApiOptions = {}): Api {
  const latency = opts.latencyMs ?? 300;
  const now = opts.now ?? (() => new Date());
  const seed: SeedState = buildSeed(now());
  const profiles = new Map<Id, Profile>(seed.profiles.map((p) => [p.id, p]));
  const accounts: SeedAccount[] = [...seed.accounts];
  const matches = new Map<Id, Match>(seed.matches.map((m) => [m.id, m]));
  const tournaments = new Map<Id, Tournament>(seed.tournaments.map((t) => [t.id, t]));
  const notifications = [...seed.notifications];
  const listeners = new Set<() => void>();
  let userId: Id | null = null;
  let counter = 0;

  replaySeedRatings();
  if (opts.demoEmail) userId = accounts.find((a) => a.email === opts.demoEmail)?.profileId ?? null;

  // ------------------------------------------------------------- helpers

  const wait = () => new Promise<void>((r) => setTimeout(r, latency));
  const emit = () => listeners.forEach((l) => l());
  const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${++counter}`;

  function me(): Id {
    if (!userId) throw new ApiError('not_authenticated');
    return userId;
  }

  function getMatchOrThrow(id: Id): Match {
    const m = matches.get(id);
    if (!m) throw new ApiError('match_not_found');
    return m;
  }

  function notify(playerId: Id, type: NotificationType, matchId: Id | null, actorId: Id | null, tournamentId: Id | null = null) {
    notifications.unshift({ id: nextId('n'), playerId, type, matchId, tournamentId, actorId, readAt: null, createdAt: now().toISOString() });
  }

  function getTournamentOrThrow(id: Id): Tournament {
    const t = tournaments.get(id);
    if (!t) throw new ApiError('tournament_not_found');
    return t;
  }

  function pairOrThrow(pairId: Id): { t: Tournament; pair: TournamentPair } {
    for (const t of tournaments.values()) {
      const pair = t.pairs.find((x) => x.id === pairId);
      if (pair) return { t, pair };
    }
    throw new ApiError('pair_not_found');
  }

  /** create_tie_match(): the real match for a tie, once both pairs are known */
  function createTieMatch(t: Tournament, tie: TournamentTie) {
    const a = t.pairs.find((x) => x.id === tie.pairAId)!;
    const b = t.pairs.find((x) => x.id === tie.pairBId)!;
    const soon = now().getTime() + 24 * 60 * 60 * 1000;
    const startsAt = tie.roundNo === 1 ? Math.max(new Date(t.startsAt).getTime(), soon) : now().getTime() + t.roundDays * 24 * 60 * 60 * 1000;
    const id = nextId('m');
    matches.set(id, {
      id,
      hostId: t.organizerId,
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: 90,
      place: t.place,
      type: 'competitive',
      levelMin: LEVEL_MIN,
      levelMax: LEVEL_MAX,
      notes: t.name,
      status: 'full',
      tournamentId: t.id,
      players: [
        { playerId: a.player1Id, slot: 1, status: 'joined' },
        { playerId: a.player2Id, slot: 2, status: 'joined' },
        { playerId: b.player1Id, slot: 3, status: 'joined' },
        { playerId: b.player2Id, slot: 4, status: 'joined' },
      ],
      result: null,
      createdAt: now().toISOString(),
    });
    tie.matchId = id;
    [a.player1Id, a.player2Id, b.player1Id, b.player2Id].forEach((pid) => notify(pid, 'tournament_match_ready', id, null, t.id));
  }

  /** draw_tournament(): random seeds, every tie up front, first-round matches */
  function draw(t: Tournament) {
    t.pairs.filter((x) => x.status === 'pending').forEach((x) => (x.status = 'withdrawn'));
    const confirmed = t.pairs.filter((x) => x.status === 'confirmed');
    const shuffled = [...confirmed].sort(() => Math.random() - 0.5);
    shuffled.forEach((x, i) => (x.seed = i + 1));
    const rounds = roundsFor(t.maxPairs);
    t.ties = [];
    for (let r = 1; r <= rounds; r++) {
      for (let pos = 1; pos <= t.maxPairs >> r; pos++) {
        const first = r === 1;
        t.ties.push({
          id: nextId('tt'),
          roundNo: r,
          pos,
          pairAId: first ? shuffled[2 * pos - 2].id : null,
          pairBId: first ? shuffled[2 * pos - 1].id : null,
          matchId: null,
          winnerPairId: null,
        });
      }
    }
    t.status = 'in_progress';
    confirmed.forEach((x) => [x.player1Id, x.player2Id].forEach((pid) => notify(pid, 'tournament_started', null, null, t.id)));
    t.ties.filter((x) => x.roundNo === 1).forEach((x) => createTieMatch(t, x));
  }

  /** advance_tournament(): the winner moves on, or becomes champion after the final */
  function advance(m: Match) {
    const t = tournaments.get(m.tournamentId!);
    const tie = t?.ties.find((x) => x.matchId === m.id);
    if (!t || !tie || !m.result) return;
    const winner = m.result.winnerTeam === 'A' ? tie.pairAId : tie.pairBId;
    tie.winnerPairId = winner;
    if (tie.roundNo === roundsFor(t.maxPairs)) {
      t.status = 'finished';
      t.championPairId = winner;
      const w = t.pairs.find((x) => x.id === winner)!;
      [w.player1Id, w.player2Id].forEach((pid) => notify(pid, 'tournament_finished', null, null, t.id));
      return;
    }
    const next = t.ties.find((x) => x.roundNo === tie.roundNo + 1 && x.pos === Math.ceil(tie.pos / 2))!;
    if (tie.pos % 2 === 1) next.pairAId = winner;
    else next.pairBId = winner;
    if (next.pairAId && next.pairBId) createTieMatch(t, next);
  }

  function started(m: Match) {
    return new Date(m.startsAt).getTime() <= now().getTime();
  }

  function applyRatings(m: Match) {
    if (!m.result) return;
    const ps = m.players
      .filter((x) => x.status === 'joined')
      .map((x) => {
        const prof = profiles.get(x.playerId)!;
        return { id: x.playerId, team: teamOf(x.slot)!, level: prof.level, reliability: prof.reliability };
      });
    for (const d of ratingDeltas(ps, m.result.winnerTeam)) {
      const prof = profiles.get(d.id)!;
      prof.level = d.newLevel;
      prof.reliability = d.reliability;
    }
  }

  /** finalize_result(): the match counts, ratings move for competitive matches */
  function finalize(m: Match, confirmer: Id) {
    m.result!.status = 'confirmed';
    m.result!.confirmedBy = confirmer;
    m.status = 'played';
    if (m.type === 'competitive') applyRatings(m);
    if (m.tournamentId) advance(m);
  }

  function replaySeedRatings() {
    const done = [...matches.values()]
      .filter((m) => m.type === 'competitive' && m.result?.status === 'confirmed')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    for (const m of done) applyRatings(m);
  }

  function isMine(m: Match, statuses: string[] = ['joined']) {
    return m.players.some((x) => x.playerId === userId && statuses.includes(x.status));
  }

  // ------------------------------------------------------------- api

  const api: Api = {
    auth: {
      async signUp({ email, password, displayName, locale }) {
        await wait();
        const mail = email.trim().toLowerCase();
        const name = displayName.trim();
        if (!EMAIL.test(mail)) throw new ApiError('invalid_email');
        if (password.length < 8) throw new ApiError('weak_password');
        if (name.length < 1 || name.length > 40) throw new ApiError('invalid_name');
        if (accounts.some((a) => a.email === mail)) throw new ApiError('email_taken');
        // handle_new_user(): signup is open and creates the profile
        const id = nextId('p');
        profiles.set(id, {
          id,
          displayName: name,
          avatarUrl: null,
          city: null,
          hand: null,
          courtSide: null,
          level: 4,
          reliability: 0,
          locale,
          isDeleted: false,
          createdAt: now().toISOString(),
        });
        accounts.push({ email: mail, password, profileId: id });
        userId = id;
        emit();
        // the fake layer signs in straight away; the real one emails a code first
        return { needsConfirmation: false };
      },
      async verifySignUp(_email, code) {
        await wait();
        if (!/^\d{6}$/.test(code.trim())) throw new ApiError('invalid_code');
      },
      async resendSignUpCode() {
        await wait();
      },
      async resetPassword(email, code, newPassword) {
        await wait();
        if (!/^\d{6}$/.test(code.trim())) throw new ApiError('invalid_code');
        if (newPassword.length < 8) throw new ApiError('weak_password');
        const acc = accounts.find((a) => a.email === email.trim().toLowerCase());
        if (!acc) throw new ApiError('invalid_code');
        acc.password = newPassword;
        userId = acc.profileId;
        emit();
      },
      isReady: () => true,
      async signIn(email, password) {
        await wait();
        const acc = accounts.find((a) => a.email === email.trim().toLowerCase() && a.password === password);
        if (!acc || profiles.get(acc.profileId)?.isDeleted) throw new ApiError('invalid_credentials');
        userId = acc.profileId;
        emit();
        return userId;
      },
      async signOut() {
        userId = null;
        emit();
      },
      async requestPasswordReset(email) {
        await wait();
        if (!EMAIL.test(email.trim())) throw new ApiError('invalid_email');
        // the real backend emails a link; it never says whether the account exists
      },
      currentUserId: () => userId,
    },

    async getProfile(id) {
      await wait();
      const prof = profiles.get(id);
      if (!prof) throw new ApiError('not_allowed');
      return clone(prof);
    },

    async getProfiles(ids) {
      await wait();
      return ids.map((id) => profiles.get(id)).filter((x): x is Profile => !!x).map(clone);
    },

    async updateProfile(update) {
      await wait();
      const prof = profiles.get(me())!;
      if (update.displayName !== undefined) {
        const name = update.displayName.trim();
        if (name.length < 1 || name.length > 40) throw new ApiError('invalid_name');
        prof.displayName = name;
      }
      if (update.city !== undefined) prof.city = update.city?.trim() || null;
      if (update.hand !== undefined) prof.hand = update.hand;
      if (update.courtSide !== undefined) prof.courtSide = update.courtSide;
      if (update.locale !== undefined) prof.locale = update.locale;
      emit();
      return clone(prof);
    },

    async searchPlayers(query) {
      await wait();
      const q = fold(query.trim());
      return [...profiles.values()]
        .filter((x) => !x.isDeleted && x.id !== userId && (!q || fold(x.displayName).includes(q)))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map(clone);
    },

    async listOpenMatches() {
      await wait();
      me();
      return [...matches.values()]
        .filter((m) => m.status === 'open' && !m.tournamentId && !started(m))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(clone);
    },

    async listMyUpcomingMatches() {
      await wait();
      me();
      return [...matches.values()]
        .filter((m) => (m.status === 'open' || m.status === 'full') && !started(m) && isMine(m, ['joined', 'requested']))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(clone);
    },

    async listMyRecentMatches() {
      await wait();
      me();
      return [...matches.values()]
        .filter((m) => m.status !== 'cancelled' && started(m) && isMine(m))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        .map(clone);
    },

    async getMatch(id) {
      await wait();
      me();
      return clone(getMatchOrThrow(id));
    },

    async createMatch(input) {
      await wait();
      const host = me();
      const starts = new Date(input.startsAt);
      if (!(starts.getTime() > now().getTime())) throw new ApiError('starts_in_past');
      const place = input.place.trim();
      if (place.length < 2 || place.length > 120) throw new ApiError('invalid_place');
      if (input.levelMin < LEVEL_MIN || input.levelMax > LEVEL_MAX || input.levelMax < input.levelMin) throw new ApiError('invalid_level_range');
      if (input.durationMinutes < 30 || input.durationMinutes > 240) throw new ApiError('invalid_duration');
      // create_match(): at most 5 upcoming open matches per host
      const open = [...matches.values()].filter((m) => m.hostId === host && m.status === 'open' && !m.tournamentId && !started(m));
      if (open.length >= 5) throw new ApiError('too_many_open');
      const id = nextId('m');
      matches.set(id, {
        id,
        hostId: host,
        startsAt: starts.toISOString(),
        durationMinutes: input.durationMinutes,
        place,
        type: input.type,
        levelMin: input.levelMin,
        levelMax: input.levelMax,
        notes: input.notes?.trim() || null,
        status: 'open',
        tournamentId: null,
        // host_joins_match(): the host takes slot 1
        players: [{ playerId: host, slot: 1, status: 'joined' }],
        result: null,
        createdAt: now().toISOString(),
      });
      emit();
      return id;
    },

    async joinMatch(id) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(id);
      if (m.tournamentId) throw new ApiError('tournament_match');
      if (m.status !== 'open' || started(m)) throw new ApiError('match_not_open');
      const existing = m.players.find((x) => x.playerId === uid);
      if (existing?.status === 'joined') throw new ApiError('already_joined');
      const level = profiles.get(uid)!.level;
      if (level < m.levelMin || level > m.levelMax) {
        if (existing) Object.assign(existing, { status: 'requested', slot: null });
        else m.players.push({ playerId: uid, slot: null, status: 'requested' });
        notify(m.hostId, 'join_requested', m.id, uid);
        emit();
        return 'requested';
      }
      const taken = new Set(m.players.filter((x) => x.status === 'joined').map((x) => x.slot));
      const slot = ([1, 2, 3, 4] as const).find((s) => !taken.has(s));
      if (!slot) throw new ApiError('match_full');
      if (existing) Object.assign(existing, { status: 'joined', slot });
      else m.players.push({ playerId: uid, slot, status: 'joined' });
      if (freeSlots(m) === 0) m.status = 'full';
      notify(m.hostId, 'player_joined', m.id, uid);
      emit();
      return 'joined';
    },

    async acceptRequest(matchId, playerId) {
      await wait();
      const m = getMatchOrThrow(matchId);
      if (m.tournamentId) throw new ApiError('tournament_match');
      if (m.hostId !== me()) throw new ApiError('not_host');
      if (m.status !== 'open' || started(m)) throw new ApiError('match_not_open');
      const taken = new Set(m.players.filter((x) => x.status === 'joined').map((x) => x.slot));
      const slot = ([1, 2, 3, 4] as const).find((s) => !taken.has(s));
      if (!slot) throw new ApiError('match_full');
      const req = m.players.find((x) => x.playerId === playerId && x.status === 'requested');
      if (!req) throw new ApiError('no_request');
      Object.assign(req, { status: 'joined', slot });
      if (freeSlots(m) === 0) m.status = 'full';
      notify(playerId, 'request_accepted', m.id, m.hostId);
      emit();
    },

    async leaveMatch(id) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(id);
      if (m.tournamentId) throw new ApiError('tournament_match');
      if (m.hostId === uid) throw new ApiError('host_cannot_leave');
      if ((m.status !== 'open' && m.status !== 'full') || started(m)) throw new ApiError('match_not_open');
      const mine = m.players.find((x) => x.playerId === uid && (x.status === 'joined' || x.status === 'requested'));
      if (!mine) throw new ApiError('not_a_player');
      Object.assign(mine, { status: 'left', slot: null });
      if (m.status === 'full') m.status = 'open';
      emit();
    },

    async cancelMatch(id) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(id);
      if (m.tournamentId) throw new ApiError('tournament_match');
      if (m.hostId !== uid) throw new ApiError('not_host');
      if (m.status !== 'open' && m.status !== 'full') throw new ApiError('match_not_open');
      m.status = 'cancelled';
      m.players.filter((x) => x.status === 'joined' && x.playerId !== uid).forEach((x) => notify(x.playerId, 'match_cancelled', m.id, uid));
      emit();
    },

    async submitResult(matchId, sets) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(matchId);
      const myTeam = teamOfPlayer(m, uid);
      if (!myTeam) throw new ApiError('not_a_player');
      if (m.status !== 'full' || !started(m)) throw new ApiError('result_not_allowed');
      if (m.result && m.result.status !== 'disputed') throw new ApiError('result_exists');
      const winnerTeam = winnerOf(sets);
      m.result = { submittedBy: uid, winnerTeam, status: 'pending', confirmedBy: null, createdAt: now().toISOString(), sets: sets.map((x) => ({ ...x })) };
      m.players.filter((x) => x.status === 'joined' && teamOf(x.slot) !== myTeam).forEach((x) => notify(x.playerId, 'result_submitted', m.id, uid));
      emit();
    },

    async confirmResult(matchId) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(matchId);
      if (!m.result || m.result.status !== 'pending') throw new ApiError('nothing_to_confirm');
      const myTeam = teamOfPlayer(m, uid);
      if (!myTeam || myTeam === teamOfPlayer(m, m.result.submittedBy)) throw new ApiError('not_allowed');
      finalize(m, uid);
      notify(m.result.submittedBy, 'result_confirmed', m.id, uid);
      emit();
    },

    async disputeResult(matchId) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(matchId);
      if (!m.result || m.result.status !== 'pending') throw new ApiError('nothing_to_dispute');
      const myTeam = teamOfPlayer(m, uid);
      if (!myTeam || myTeam === teamOfPlayer(m, m.result.submittedBy)) throw new ApiError('not_allowed');
      m.result.status = 'disputed';
      notify(m.result.submittedBy, 'result_disputed', m.id, uid);
      emit();
    },

    async hostConfirmResult(matchId) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(matchId);
      if (!m.result || m.result.status !== 'pending') throw new ApiError('nothing_to_confirm');
      if (m.hostId !== uid) throw new ApiError('not_host');
      const age = now().getTime() - new Date(m.result.createdAt).getTime();
      if (age < HOST_CONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000) throw new ApiError('too_early');
      finalize(m, uid);
      m.players.filter((x) => x.status === 'joined' && x.playerId !== uid).forEach((x) => notify(x.playerId, 'result_confirmed', m.id, uid));
      emit();
    },

    async listPlayerRecentMatches(playerId) {
      await wait();
      me();
      return [...matches.values()]
        .filter((m) => m.status !== 'cancelled' && started(m) && m.players.some((x) => x.playerId === playerId && x.status === 'joined'))
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
        .map(clone);
    },

    async listTournaments() {
      await wait();
      me();
      return [...tournaments.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(clone);
    },

    async getTournament(id) {
      await wait();
      me();
      return clone(getTournamentOrThrow(id));
    },

    async createTournament(input) {
      await wait();
      const organizer = me();
      const name = input.name.trim();
      const place = input.place.trim();
      if (name.length < 2 || name.length > 80) throw new ApiError('invalid_name');
      if (place.length < 2 || place.length > 120) throw new ApiError('invalid_place');
      if (!TOURNAMENT_SIZES.includes(input.players)) throw new ApiError('invalid_size');
      if (!(new Date(input.startsAt).getTime() > now().getTime())) throw new ApiError('starts_in_past');
      // create_tournament(): at most 2 tournaments taking entries per organizer
      if ([...tournaments.values()].filter((x) => x.organizerId === organizer && x.status === 'registration').length >= 2) {
        throw new ApiError('too_many_open');
      }
      const id = nextId('t');
      tournaments.set(id, {
        id,
        organizerId: organizer,
        name,
        description: input.description?.trim() || null,
        place,
        startsAt: new Date(input.startsAt).toISOString(),
        maxPairs: (input.players / 2) as Tournament['maxPairs'],
        roundDays: Math.min(30, Math.max(1, Math.round(input.roundDays))),
        status: 'registration',
        championPairId: null,
        pairs: [],
        ties: [],
        createdAt: now().toISOString(),
      });
      emit();
      return id;
    },

    async registerPair(tournamentId, partnerId) {
      await wait();
      const uid = me();
      const t = getTournamentOrThrow(tournamentId);
      if (t.status !== 'registration') throw new ApiError('registration_closed');
      if (partnerId === uid) throw new ApiError('partner_is_self');
      const partner = profiles.get(partnerId);
      if (!partner || partner.isDeleted) throw new ApiError('partner_not_found');
      if (livePairOf(t, uid) || livePairOf(t, partnerId)) throw new ApiError('already_in_tournament');
      const id = nextId('tp');
      t.pairs.push({ id, player1Id: uid, player2Id: partnerId, status: 'pending', seed: null, createdAt: now().toISOString() });
      notify(partnerId, 'tournament_pair_invite', null, uid, t.id);
      emit();
      return id;
    },

    async respondPairInvite(pairId, accept) {
      await wait();
      const uid = me();
      const { t, pair } = pairOrThrow(pairId);
      if (pair.player2Id !== uid) throw new ApiError('not_invited');
      if (pair.status !== 'pending') throw new ApiError('nothing_to_answer');
      if (t.status !== 'registration') throw new ApiError('registration_closed');
      if (!accept) {
        pair.status = 'withdrawn';
        notify(pair.player1Id, 'tournament_pair_declined', null, uid, t.id);
        emit();
        return;
      }
      const confirmed = t.pairs.filter((x) => x.status === 'confirmed').length;
      if (confirmed >= t.maxPairs) throw new ApiError('tournament_full');
      pair.status = 'confirmed';
      notify(pair.player1Id, 'tournament_pair_accepted', null, uid, t.id);
      // the draw runs inside the call that accepts the last pair
      if (confirmed + 1 === t.maxPairs) draw(t);
      emit();
    },

    async withdrawPair(pairId) {
      await wait();
      const uid = me();
      const { t, pair } = pairOrThrow(pairId);
      if (pair.player1Id !== uid && pair.player2Id !== uid) throw new ApiError('not_allowed');
      if (pair.status === 'withdrawn') throw new ApiError('nothing_to_withdraw');
      if (t.status !== 'registration') throw new ApiError('registration_closed');
      pair.status = 'withdrawn';
      notify(uid === pair.player1Id ? pair.player2Id : pair.player1Id, 'tournament_pair_withdrawn', null, uid, t.id);
      emit();
    },

    async cancelTournament(id) {
      await wait();
      const uid = me();
      const t = getTournamentOrThrow(id);
      if (t.organizerId !== uid) throw new ApiError('not_organizer');
      if (t.status !== 'registration' && t.status !== 'in_progress') throw new ApiError('tournament_closed');
      t.status = 'cancelled';
      for (const m of matches.values()) if (m.tournamentId === t.id && (m.status === 'open' || m.status === 'full')) m.status = 'cancelled';
      t.pairs
        .filter((x) => x.status !== 'withdrawn')
        .forEach((x) => [x.player1Id, x.player2Id].forEach((pid) => notify(pid, 'tournament_cancelled', null, uid, t.id)));
      emit();
    },

    async organizerSetResult(matchId, sets) {
      await wait();
      const uid = me();
      const m = getMatchOrThrow(matchId);
      if (!m.tournamentId) throw new ApiError('not_tournament_match');
      if (m.hostId !== uid) throw new ApiError('not_organizer');
      if (m.status !== 'full') throw new ApiError('result_not_allowed');
      const winnerTeam = winnerOf(sets);
      m.result = { submittedBy: uid, winnerTeam, status: 'pending', confirmedBy: null, createdAt: now().toISOString(), sets: sets.map((x) => ({ ...x })) };
      finalize(m, uid);
      emit();
    },

    async ranking(since) {
      await wait();
      me();
      const stats = new Map<Id, { played: number; won: number }>();
      for (const m of matches.values()) {
        if (m.type !== 'competitive' || m.result?.status !== 'confirmed') continue;
        if (since && new Date(m.startsAt) < since) continue;
        for (const x of m.players) {
          if (x.status !== 'joined') continue;
          const s = stats.get(x.playerId) ?? { played: 0, won: 0 };
          s.played += 1;
          if (teamOf(x.slot) === m.result.winnerTeam) s.won += 1;
          stats.set(x.playerId, s);
        }
      }
      const rows: RankingEntry[] = [...profiles.values()]
        .filter((x) => !x.isDeleted)
        .map((x) => {
          const s = stats.get(x.id) ?? { played: 0, won: 0 };
          return {
            playerId: x.id,
            displayName: x.displayName,
            avatarUrl: x.avatarUrl,
            level: x.level,
            played: s.played,
            won: s.won,
            lost: s.played - s.won,
            winRate: s.played ? Math.round((1000 * s.won) / s.played) / 10 : 0,
          };
        });
      // ranking(): won, then win rate, then played, then name
      return rows.sort((a, b) => b.won - a.won || b.winRate - a.winRate || b.played - a.played || a.displayName.localeCompare(b.displayName));
    },

    async deleteAccount() {
      await wait();
      const uid = me();
      // the essentials of delete_account(): anonymise, leave future matches, sign out
      const prof = profiles.get(uid)!;
      Object.assign(prof, { displayName: 'Deleted player', avatarUrl: null, city: null, hand: null, courtSide: null, isDeleted: true });
      for (const m of matches.values()) {
        if (m.tournamentId || started(m) || (m.status !== 'open' && m.status !== 'full')) continue;
        if (m.hostId === uid) m.status = 'cancelled';
        const mine = m.players.find((x) => x.playerId === uid && x.status !== 'left');
        if (mine) {
          Object.assign(mine, { status: 'left', slot: null });
          if (m.status === 'full') m.status = 'open';
        }
      }
      const index = accounts.findIndex((a) => a.profileId === uid);
      if (index >= 0) accounts.splice(index, 1);
      userId = null;
      emit();
    },

    async registerPushToken() {
      // the fake layer sends no pushes
    },

    async listNotifications() {
      await wait();
      const uid = me();
      return notifications.filter((x) => x.playerId === uid).map(({ playerId: _owner, ...rest }) => clone(rest) as AppNotification);
    },

    async markNotificationsRead() {
      await wait();
      const uid = me();
      const at = now().toISOString();
      notifications.filter((x) => x.playerId === uid && !x.readAt).forEach((x) => (x.readAt = at));
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
