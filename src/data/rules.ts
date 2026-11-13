// Pure rules shared by the fake data layer and the screens. Each one mirrors a
// rule in replica/schema.sql, so the app and the database agree.
import { ApiError } from './errors';
import { teamOf, type Id, type Match, type SetScore, type Team } from './types';

export const SET_MAX_GAMES = 20;
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 10;
export const HOST_CONFIRM_AFTER_DAYS = 7;

/** save_sets(): 1 to 3 sets, no tied set, games 0-20, and someone must win. Returns the winning team. */
export function winnerOf(sets: SetScore[]): Team {
  if (sets.length < 1 || sets.length > 3) throw new ApiError('invalid_sets');
  let a = 0;
  let b = 0;
  for (const s of sets) {
    const ok = Number.isInteger(s.a) && Number.isInteger(s.b) && s.a >= 0 && s.b >= 0 && s.a <= SET_MAX_GAMES && s.b <= SET_MAX_GAMES;
    if (!ok || s.a === s.b) throw new ApiError('invalid_sets');
    if (s.a > s.b) a += 1;
    else b += 1;
  }
  if (a === b) throw new ApiError('invalid_sets');
  return a > b ? 'A' : 'B';
}

/** apply_ratings(): Elo-style on the 1-10 scale; K shrinks as reliability grows. */
export function ratingDeltas(
  players: { id: Id; team: Team; level: number; reliability: number }[],
  winner: Team,
): { id: Id; oldLevel: number; newLevel: number; reliability: number }[] {
  const avg = (team: Team) => {
    const ps = players.filter((p) => p.team === team);
    return ps.reduce((s, p) => s + p.level, 0) / Math.max(1, ps.length);
  };
  const expA = 1 / (1 + Math.pow(10, (avg('B') - avg('A')) / 2));
  const winA = winner === 'A' ? 1 : 0;
  return players.map((p) => {
    const delta = 0.15 * (1.5 - p.reliability) * (p.team === 'A' ? winA - expA : expA - winA);
    const newLevel = Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round((p.level + delta) * 100) / 100));
    return { id: p.id, oldLevel: p.level, newLevel, reliability: Math.min(1, Math.round((p.reliability + 0.05) * 100) / 100) };
  });
}

export function joinedPlayers(m: Match) {
  return m.players.filter((p) => p.status === 'joined');
}

export function teamOfPlayer(m: Match, playerId: Id): Team | null {
  const p = m.players.find((x) => x.playerId === playerId && x.status === 'joined');
  return p ? teamOf(p.slot) : null;
}

export function freeSlots(m: Match): number {
  return 4 - joinedPlayers(m).length;
}

export function hasStarted(m: Match, now = Date.now()): boolean {
  return new Date(m.startsAt).getTime() <= now;
}

/** What the signed-in player can do on a match; screens show exactly these actions. */
export function matchActions(m: Match, me: Id | null, now = Date.now()) {
  const mine = m.players.find((p) => p.playerId === me);
  const joined = mine?.status === 'joined';
  const requested = mine?.status === 'requested';
  const isHost = m.hostId === me;
  const started = hasStarted(m, now);
  const live = m.status === 'open' || m.status === 'full';
  const myTeam = me ? teamOfPlayer(m, me) : null;
  const r = m.result;
  const submitterTeam = r ? teamOfPlayer(m, r.submittedBy) : null;
  const rival = !!r && !!myTeam && myTeam !== submitterTeam;
  const pendingFor = r ? now - new Date(r.createdAt).getTime() : 0;
  return {
    canJoin: !!me && !joined && !requested && m.status === 'open' && !started && !m.tournamentId,
    canLeave: joined && !isHost && live && !started && !m.tournamentId,
    canCancel: isHost && live && !m.tournamentId,
    canSubmitResult: joined && m.status === 'full' && started && (!r || r.status === 'disputed'),
    canConfirm: rival && r?.status === 'pending',
    canDispute: rival && r?.status === 'pending',
    canHostConfirm: isHost && r?.status === 'pending' && pendingFor >= HOST_CONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000,
    isHost,
    joined,
    requested,
    myTeam,
  };
}
