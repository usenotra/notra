export const TOTP_ISSUER = "Notra";
export const TOTP_FACTOR_TYPE = "totp";

/**
 * Identifies the user and challenge of the sign-in attempt that is currently
 * mid-MFA, so backup-code recovery and per-account rate limits can be bound
 * to it without the client ever handling the user's identity.
 */
export const MFA_ATTEMPT_COOKIE = "notra_mfa_attempt";
/**
 * Carries the pending WorkOS credentials from the social callback to the
 * login page so they never appear in a URL.
 */
export const MFA_PENDING_COOKIE = "notra_mfa_pending";
export const MFA_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export const MFA_ERROR_CODES = {
  CHALLENGE: "mfa_challenge",
  ENROLLMENT: "mfa_enrollment",
} as const;

export const SECURITY_ERROR_CODES = {
  INVALID_CODE: "invalid_code",
  UNAVAILABLE: "unavailable",
} as const;

/** `/login?mfa=pending` tells the login page to pick up the pending cookie. */
export const LOGIN_MFA_QUERY_KEY = "mfa";
export const LOGIN_MFA_QUERY_VALUE = "pending";

export const BACKUP_CODE_COUNT = 10;
/** Lowercase, no ambiguous characters (0/o, 1/l/i). */
export const BACKUP_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const LOGIN_ERROR_KEYS = {
  MFA_ENROLLMENT_REQUIRED: "mfa-enrollment-required",
} as const;
