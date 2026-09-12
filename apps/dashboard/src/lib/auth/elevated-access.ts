import {
  ELEVATED_ACCESS_COOKIE,
  ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS,
} from "@/constants/security";
import {
  clearShortLivedCookie,
  readShortLivedCookie,
  storeShortLivedCookie,
} from "@/lib/auth/short-lived-cookie";

const MS_PER_SECOND = 1000;

function resolveMaxAgeSeconds(expiresAt: string | null | undefined) {
  const expiresMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresMs)) {
    return ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS;
  }
  const remaining = Math.floor((expiresMs - Date.now()) / MS_PER_SECOND);
  return remaining > 0 ? remaining : ELEVATED_ACCESS_FALLBACK_MAX_AGE_SECONDS;
}

export const readElevatedAccessToken = () =>
  readShortLivedCookie(ELEVATED_ACCESS_COOKIE);

export const storeElevatedAccessToken = (
  token: string,
  expiresAt: string | null | undefined
) =>
  storeShortLivedCookie(
    ELEVATED_ACCESS_COOKIE,
    token,
    resolveMaxAgeSeconds(expiresAt)
  );

export const clearElevatedAccessToken = () =>
  clearShortLivedCookie(ELEVATED_ACCESS_COOKIE);
