import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  MFA_ATTEMPT_COOKIE,
  MFA_COOKIE_MAX_AGE_SECONDS,
  MFA_PENDING_COOKIE,
} from "@/constants/security";
import {
  clearShortLivedCookie,
  readShortLivedCookie,
  storeShortLivedCookie,
} from "@/lib/auth/short-lived-cookie";
import type { MfaAttempt, PendingMfaChallenge } from "@/types/auth/mfa-cookies";

const mfaAttemptSchema = z.object({
  workosUserId: z.string().min(1),
  authenticationChallengeId: z.string().min(1),
});

const pendingMfaChallengeSchema = z.object({
  pendingAuthenticationToken: z.string().min(1),
  authenticationChallengeId: z.string().min(1),
  email: z.string(),
});

async function readJsonCookie<T>(
  name: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  const raw = await readShortLivedCookie(name);
  if (!raw) {
    return null;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function storeMfaAttempt(attempt: MfaAttempt) {
  return storeShortLivedCookie(
    MFA_ATTEMPT_COOKIE,
    JSON.stringify(attempt),
    MFA_COOKIE_MAX_AGE_SECONDS
  );
}

export function readMfaAttempt() {
  return readJsonCookie(MFA_ATTEMPT_COOKIE, mfaAttemptSchema);
}

export function storePendingMfaChallenge(challenge: PendingMfaChallenge) {
  return storeShortLivedCookie(
    MFA_PENDING_COOKIE,
    JSON.stringify(challenge),
    MFA_COOKIE_MAX_AGE_SECONDS
  );
}

export function readPendingMfaChallenge() {
  return readJsonCookie(MFA_PENDING_COOKIE, pendingMfaChallengeSchema);
}

/** Drops both MFA cookies once the attempt they belong to is over. */
export async function clearMfaCookies() {
  await Promise.all([
    clearShortLivedCookie(MFA_ATTEMPT_COOKIE),
    clearShortLivedCookie(MFA_PENDING_COOKIE),
  ]);
}
