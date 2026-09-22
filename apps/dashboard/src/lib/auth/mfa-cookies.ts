import "zod/compile";
// biome-ignore lint/performance/noNamespaceImport: Zod recommended way to import
import * as z from "zod";

import {
  MFA_ATTEMPT_COOKIE,
  MFA_COOKIE_MAX_AGE_SECONDS,
  MFA_PENDING_COOKIE_PREFIX,
  TOTP_ENROLLMENT_COOKIE,
} from "@/constants/security";
import {
  clearSignedCookie,
  clearSignedCookiesWithPrefix,
  readSignedCookie,
  storeSignedCookie,
} from "@/lib/auth/signed-cookie";
import type {
  MfaAttempt,
  PendingMfaFlow,
  TotpEnrollmentInProgress,
} from "@/types/auth/mfa-cookies";

const mfaAttemptSchema = z.object({
  workosUserId: z.string().min(1),
  authenticationChallengeId: z.string().min(1),
  startedAt: z.number().int().positive(),
});

const pendingMfaFlowSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("challenge"),
    pendingAuthenticationToken: z.string().min(1),
    authenticationChallengeId: z.string().min(1),
    email: z.string(),
  }),
  z.object({
    kind: z.literal("enrollment"),
    pendingAuthenticationToken: z.string().min(1),
    workosUserId: z.string().min(1),
    email: z.string(),
  }),
]);

const totpEnrollmentInProgressSchema = z.object({
  localUserId: z.string().min(1),
  factorId: z.string().min(1),
  authenticationChallengeId: z.string().min(1),
});

const mfaFlowIdSchema = z.uuid();

function getPendingMfaCookieName(flowId: string) {
  const parsed = mfaFlowIdSchema.safeParse(flowId);
  return parsed.success ? `${MFA_PENDING_COOKIE_PREFIX}_${parsed.data}` : null;
}

export function storeMfaAttempt(attempt: MfaAttempt) {
  return storeSignedCookie(
    MFA_ATTEMPT_COOKIE,
    attempt,
    MFA_COOKIE_MAX_AGE_SECONDS
  );
}

export function readMfaAttempt() {
  return readSignedCookie(MFA_ATTEMPT_COOKIE, mfaAttemptSchema);
}

export function clearMfaAttemptCookie() {
  return clearSignedCookie(MFA_ATTEMPT_COOKIE);
}

/** Returns the flow id that `/login?mfa=<id>` uses to find the cookie. */
export async function storePendingMfaFlow(flow: PendingMfaFlow) {
  const flowId = crypto.randomUUID();
  await storeSignedCookie(
    `${MFA_PENDING_COOKIE_PREFIX}_${flowId}`,
    flow,
    MFA_COOKIE_MAX_AGE_SECONDS
  );
  return flowId;
}

export function readPendingMfaFlow(flowId: string) {
  const cookieName = getPendingMfaCookieName(flowId);
  return cookieName
    ? readSignedCookie(cookieName, pendingMfaFlowSchema)
    : Promise.resolve(null);
}

/** Once a sign-in completes, no handoff that led to it may be replayed. */
export function clearAllPendingMfaFlows() {
  return clearSignedCookiesWithPrefix(`${MFA_PENDING_COOKIE_PREFIX}_`);
}

export async function clearPendingMfaFlow(flowId: string) {
  const cookieName = getPendingMfaCookieName(flowId);
  if (cookieName) {
    await clearSignedCookie(cookieName);
  }
}

export function storeTotpEnrollmentInProgress(
  enrollment: TotpEnrollmentInProgress
) {
  return storeSignedCookie(
    TOTP_ENROLLMENT_COOKIE,
    enrollment,
    MFA_COOKIE_MAX_AGE_SECONDS
  );
}

export function readTotpEnrollmentInProgress() {
  return readSignedCookie(
    TOTP_ENROLLMENT_COOKIE,
    totpEnrollmentInProgressSchema
  );
}

export function clearTotpEnrollmentInProgress() {
  return clearSignedCookie(TOTP_ENROLLMENT_COOKIE);
}
