// The app's data shapes. They follow replica/schema.sql column for column, in
// camelCase, so the Supabase data layer can replace the fake one without any
// screen changing.

export type Id = string;
export type Locale = 'es' | 'en';
export type Team = 'A' | 'B';

export interface Profile {
  id: Id;
  displayName: string;
  avatarUrl: string | null;
  city: string | null;
  hand: 'right' | 'left' | null;
  courtSide: 'left' | 'right' | 'both' | null;
  level: number;
  reliability: number;
  locale: Locale;
  isDeleted: boolean;
  createdAt: string;
}

export type MatchType = 'friendly' | 'competitive';
export type MatchStatus = 'open' | 'full' | 'played' | 'cancelled';

export interface MatchPlayer {
  playerId: Id;
  /** 1-2 are team A, 3-4 team B; null while requested or after leaving */
  slot: 1 | 2 | 3 | 4 | null;
  status: 'joined' | 'requested' | 'left';
}

export interface SetScore {
  a: number;
  b: number;
}

export interface MatchResult {
  submittedBy: Id;
  winnerTeam: Team;
  status: 'pending' | 'confirmed' | 'disputed';
  confirmedBy: Id | null;
  createdAt: string;
  sets: SetScore[];
}

export interface Match {
  id: Id;
  hostId: Id;
  startsAt: string;
  durationMinutes: number;
  place: string;
  type: MatchType;
  levelMin: number;
  levelMax: number;
  notes: string | null;
  status: MatchStatus;
  tournamentId: Id | null;
  players: MatchPlayer[];
  result: MatchResult | null;
  createdAt: string;
}

export interface NewMatch {
  startsAt: string;
  durationMinutes: number;
  place: string;
  type: MatchType;
  levelMin: number;
  levelMax: number;
  notes?: string;
}

export interface RankingEntry {
  playerId: Id;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  played: number;
  won: number;
  lost: number;
  /** 0 to 100 */
  winRate: number;
}

// ---------------------------------------------------------------- tournaments
// tournaments, tournament_pairs and tournament_ties in replica/schema.sql

export type TournamentStatus = 'registration' | 'in_progress' | 'finished' | 'cancelled';

export interface TournamentPair {
  id: Id;
  /** who registered the pair */
  player1Id: Id;
  /** the partner they named; the pair counts once this player accepts */
  player2Id: Id;
  status: 'pending' | 'confirmed' | 'withdrawn';
  seed: number | null;
  createdAt: string;
}

export interface TournamentTie {
  id: Id;
  /** 1 is the first round; the last round is the final */
  roundNo: number;
  pos: number;
  pairAId: Id | null;
  pairBId: Id | null;
  matchId: Id | null;
  winnerPairId: Id | null;
}

export interface Tournament {
  id: Id;
  organizerId: Id;
  name: string;
  description: string | null;
  place: string;
  startsAt: string;
  /** 4, 8 or 16 pairs: 8, 16 or 32 players */
  maxPairs: 4 | 8 | 16;
  roundDays: number;
  status: TournamentStatus;
  championPairId: Id | null;
  pairs: TournamentPair[];
  ties: TournamentTie[];
  createdAt: string;
}

export interface NewTournament {
  name: string;
  description?: string;
  place: string;
  startsAt: string;
  players: 8 | 16 | 32;
  roundDays: number;
}

// ---------------------------------------------------------------- notifications

export type NotificationType =
  | 'player_joined'
  | 'join_requested'
  | 'request_accepted'
  | 'match_cancelled'
  | 'result_submitted'
  | 'result_confirmed'
  | 'result_disputed'
  | 'result_reminder'
  | 'tournament_pair_invite'
  | 'tournament_pair_accepted'
  // the SQL stores a declined invite as tournament_pair_accepted with accepted: false;
  // the backend maps that payload to this type
  | 'tournament_pair_declined'
  | 'tournament_pair_withdrawn'
  | 'tournament_started'
  | 'tournament_match_ready'
  | 'tournament_cancelled'
  | 'tournament_finished';

export interface AppNotification {
  id: Id;
  type: NotificationType;
  matchId: Id | null;
  tournamentId: Id | null;
  /** who caused it, when there is someone */
  actorId: Id | null;
  readAt: string | null;
  createdAt: string;
}

export interface ProfileUpdate {
  displayName?: string;
  city?: string | null;
  hand?: Profile['hand'];
  courtSide?: Profile['courtSide'];
  locale?: Locale;
}

export function teamOf(slot: MatchPlayer['slot']): Team | null {
  if (slot == null) return null;
  return slot <= 2 ? 'A' : 'B';
}
