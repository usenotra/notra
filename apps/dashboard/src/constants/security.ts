export const TOTP_ISSUER = "Notra";
export const TOTP_FACTOR_TYPE = "totp";

export const WORKOS_WIDGETS_API_BASE_URL = "https://api.workos.com";
export const WORKOS_WIDGETS_API_VERSION = "1";
export const WORKOS_WIDGETS_TYPE = "user-security";
export const WORKOS_WIDGETS_USER_PROFILE_PATH = "/_widgets/UserProfile";
export const WORKOS_ELEVATED_ACCESS_HEADER = "x-elevated-access-token";

export const ELEVATED_ACCESS_COOKIE = "notra_elevated_access";
export const ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS = 10 * 60;
/** Identifies the user mid-challenge so a backup code can be redeemed. */
export const MFA_RECOVERY_COOKIE = "notra_mfa_recovery";
export const MFA_RECOVERY_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export const MFA_ERROR_CODES = {
  CHALLENGE: "mfa_challenge",
  ENROLLMENT: "mfa_enrollment",
} as const;

export const SECURITY_ERROR_CODES = {
  ELEVATED_ACCESS_REQUIRED: "elevated_access_required",
  INVALID_CODE: "invalid_code",
  UNAVAILABLE: "unavailable",
} as const;

export const LOGIN_MFA_QUERY_KEYS = {
  token: "mfa",
  challenge: "challenge",
} as const;

export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_LENGTH = 8;
/** Lowercase, no ambiguous characters (0/o, 1/l/i). */
export const BACKUP_CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const LOGIN_ERROR_KEYS = {
  MFA_ENROLLMENT_REQUIRED: "mfa-enrollment-required",
} as const;
