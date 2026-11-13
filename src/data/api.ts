import type {
  AppNotification,
  Id,
  Locale,
  Match,
  NewMatch,
  NewTournament,
  Profile,
  ProfileUpdate,
  RankingEntry,
  SetScore,
  Tournament,
} from './types';

/**
 * The one contract between screens and data. The fake implementation
 * (src/data/fake) and the Supabase one (/replica-backend) both implement it,
 * so swapping them changes no screen code. Every method that changes data
 * mirrors a SQL function in replica/schema.sql and throws ApiError with the
 * same codes.
 */
export interface Api {
  auth: {
    signUp(input: { email: string; password: string; displayName: string; locale: Locale }): Promise<Id>;
    signIn(email: string, password: string): Promise<Id>;
    signOut(): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    currentUserId(): Id | null;
  };

  getProfile(id: Id): Promise<Profile>;
  getProfiles(ids: Id[]): Promise<Profile[]>;
  updateProfile(update: ProfileUpdate): Promise<Profile>;
  searchPlayers(query: string): Promise<Profile[]>;

  /** open, upcoming, non-tournament matches, soonest first */
  listOpenMatches(): Promise<Match[]>;
  /** upcoming matches the user plays in or asked to join */
  listMyUpcomingMatches(): Promise<Match[]>;
  /** matches of the user that have started, newest first, with or without a result */
  listMyRecentMatches(): Promise<Match[]>;
  getMatch(id: Id): Promise<Match>;

  createMatch(input: NewMatch): Promise<Id>;
  joinMatch(id: Id): Promise<'joined' | 'requested'>;
  acceptRequest(matchId: Id, playerId: Id): Promise<void>;
  leaveMatch(id: Id): Promise<void>;
  cancelMatch(id: Id): Promise<void>;

  submitResult(matchId: Id, sets: SetScore[]): Promise<void>;
  confirmResult(matchId: Id): Promise<void>;
  disputeResult(matchId: Id): Promise<void>;
  hostConfirmResult(matchId: Id): Promise<void>;

  /** another player's matches that have started, newest first (S13) */
  listPlayerRecentMatches(playerId: Id): Promise<Match[]>;

  /** p_since: start of the period, or null for all time */
  ranking(since: Date | null): Promise<RankingEntry[]>;

  // tournaments: mirror create_tournament, register_pair, respond_pair_invite,
  // withdraw_pair, cancel_tournament and organizer_set_result
  listTournaments(): Promise<Tournament[]>;
  getTournament(id: Id): Promise<Tournament>;
  createTournament(input: NewTournament): Promise<Id>;
  registerPair(tournamentId: Id, partnerId: Id): Promise<Id>;
  respondPairInvite(pairId: Id, accept: boolean): Promise<void>;
  withdrawPair(pairId: Id): Promise<void>;
  cancelTournament(id: Id): Promise<void>;
  organizerSetResult(matchId: Id, sets: SetScore[]): Promise<void>;

  listNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(): Promise<void>;

  /** called after any change, so open screens can refresh */
  subscribe(listener: () => void): () => void;
}
