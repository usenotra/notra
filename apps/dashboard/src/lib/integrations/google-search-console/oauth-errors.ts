const OAUTH_ERROR_BY_STATUS = new Map<number, string>([
  [401, "gsc_session_expired"],
  [403, "gsc_forbidden"],
]);

export const GSC_ERROR_CODES = [
  "gsc_not_configured",
  "gsc_access_denied",
  "gsc_missing_refresh_token",
  "gsc_token_exchange_failed",
  "gsc_auth_failed",
  "gsc_disconnect_in_progress",
  "gsc_expired_state",
  "gsc_session_mismatch",
  "gsc_rate_limited",
  "gsc_session_expired",
  "gsc_forbidden",
  "gsc_invalid_callback",
] as const;

export function gscOAuthErrorParam(
  status: number,
  fallback = "gsc_auth_failed"
): string {
  return OAUTH_ERROR_BY_STATUS.get(status) ?? fallback;
}
