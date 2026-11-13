// In-memory data layer with the same rules as replica/schema.sql. Used until
// /replica-backend swaps in Supabase. State lives in memory: a reload resets it.
import type { Api } from '../api';
import { ApiError } from '../errors';
import { freeSlots, HOST_CONFIRM_AFTER_DAYS, LEVEL_MAX, LEVEL_MIN, ratingDeltas, teamOfPlayer, winnerOf } from '../rules';
import { teamOf, type AppNotification, type Id, type Match, type NotificationType, type Profile, type RankingEntry } from '../types';

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

  function notify(playerId: Id, type: NotificationType, matchId: Id | null, actorId: Id | null) {
    notifications.unshift({ id: nextId('n'), playerId, type, matchId, actorId, readAt: null, createdAt: now().toISOString() });
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
        return id;
      },
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
