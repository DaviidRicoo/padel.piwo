import type {
  AppNotification,
  AvatarImage,
  Id,
  Locale,
  Match,
  NewMatch,
  NewTournament,
  NotificationSettings,
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
 * mirrors a SQL function in supabase/migrations/20261114000100_schema.sql and throws ApiError with the
 * same codes.
 */
export interface Api {
  auth: {
    /** needsConfirmation: a 6-digit code was emailed and verifySignUp must follow */
    signUp(input: { email: string; password: string; displayName: string; locale: Locale }): Promise<{ needsConfirmation: boolean }>;
    verifySignUp(email: string, code: string): Promise<void>;
    resendSignUpCode(email: string): Promise<void>;
    signIn(email: string, password: string): Promise<Id>;
    /** everywhere: end the sessions on every device, not just this one */
    signOut(everywhere?: boolean): Promise<void>;
    /** emails a 6-digit code; never says whether the account exists */
    requestPasswordReset(email: string): Promise<void>;
    /** checks the emailed code, sets the new password and signs in */
    resetPassword(email: string, code: string, newPassword: string): Promise<void>;
    currentUserId(): Id | null;
    /** false until a stored session has been read at start-up */
    isReady(): boolean;
  };

  /** anonymises the player (delete_account) and deletes the login itself */
  deleteAccount(): Promise<void>;
  registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void>;

  getProfile(id: Id): Promise<Profile>;
  getProfiles(ids: Id[]): Promise<Profile[]>;
  updateProfile(update: ProfileUpdate): Promise<Profile>;
  /** uploads a new photo (replacing the old one), or removes it with null; set_avatar() */
  setAvatar(image: AvatarImage | null): Promise<Profile>;

  /** the signed-in player's push switches (S14); all on until changed */
  getNotificationSettings(): Promise<NotificationSettings>;
  updateNotificationSettings(patch: Partial<NotificationSettings>): Promise<NotificationSettings>;
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
