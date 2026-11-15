// Error codes are the exception names the SQL functions raise (supabase/migrations/20261114000100_schema.sql),
// plus a few the client adds. Screens translate them with t(`errors.${code}`).
export const ERROR_CODES = [
  'not_authenticated',
  'invalid_credentials',
  'email_taken',
  'invalid_email',
  'weak_password',
  'invalid_name',
  'match_not_found',
  'match_not_open',
  'match_full',
  'already_joined',
  'not_host',
  'host_cannot_leave',
  'not_a_player',
  'no_request',
  'result_not_allowed',
  'result_exists',
  'invalid_sets',
  'nothing_to_confirm',
  'nothing_to_dispute',
  'not_allowed',
  'too_early',
  'starts_in_past',
  'invalid_place',
  'invalid_level_range',
  'invalid_duration',
  'tournament_match',
  'not_tournament_match',
  'not_organizer',
  'tournament_not_found',
  'registration_closed',
  'partner_is_self',
  'partner_not_found',
  'already_in_tournament',
  'pair_not_found',
  'not_invited',
  'nothing_to_answer',
  'tournament_full',
  'nothing_to_withdraw',
  'tournament_closed',
  'invalid_size',
  'too_many_open',
  'invalid_code',
  'invalid_avatar',
  'image_too_large',
  'email_not_confirmed',
  'rate_limited',
  'network',
  'unknown',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class ApiError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = 'ApiError';
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  const known = ERROR_CODES.find((c) => msg.includes(c));
  return new ApiError(known ?? 'unknown');
}
