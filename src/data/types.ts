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

export type NotificationType =
  | 'player_joined'
  | 'join_requested'
  | 'request_accepted'
  | 'match_cancelled'
  | 'result_submitted'
  | 'result_confirmed'
  | 'result_disputed'
  | 'result_reminder';

export interface AppNotification {
  id: Id;
  type: NotificationType;
  matchId: Id | null;
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
