export const TOTP_ISSUER = "Notra";
export const TOTP_FACTOR_TYPE = "totp";

export const MFA_ATTEMPT_COOKIE = "notra_mfa_attempt";
export const MFA_PENDING_COOKIE_PREFIX = "notra_mfa_pending";
export const TOTP_ENROLLMENT_COOKIE = "notra_totp_enrollment";
export const MFA_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export const MFA_ERROR_CODES = {
  CHALLENGE: "mfa_challenge",
  ENROLLMENT: "mfa_enrollment",
} as const;

export const SECURITY_ERROR_CODES = {
  INVALID_CODE: "invalid_code",
  UNAVAILABLE: "unavailable",
} as const;

export const LOGIN_MFA_QUERY_KEY = "mfa";

export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
