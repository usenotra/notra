import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import type { AuthFlowResult } from "@notra/schemas/types/dashboard/auth";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { MFA_ERROR_CODES, TOTP_FACTOR_TYPE } from "@/constants/security";
import { clearBackupCodes } from "@/lib/auth/backup-codes";
import { WorkOSAuthError } from "@/lib/auth/errors";
import { storeMfaAttempt } from "@/lib/auth/mfa-cookies";
import { createTotpFactor } from "@/lib/auth/workos-mfa";
import type { WorkOSErrorInfo } from "@/types/auth/workos-error";

const tryWorkOS = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => new WorkOSAuthError({ error }),
  });

const createMfaChallenge = Effect.fn("auth.mfa.createChallenge")(function* (
  authenticationFactorId: string
) {
  const challenge = yield* tryWorkOS(() =>
    getWorkOS().multiFactorAuth.challengeFactor({ authenticationFactorId })
  );
  return challenge.id;
});

/**
 * Binds the browser to this attempt: the challenge form can fall back to a
 * backup code and verification is rate-limited per account, without the
 * client ever handling the user's identity.
 */
const rememberAttempt = (
  workosUserId: string,
  authenticationChallengeId: string
) =>
  Effect.promise(() =>
    storeMfaAttempt({
      workosUserId,
      authenticationChallengeId,
      startedAt: Date.now(),
    })
  );

async function forgetFactorState(workosUserId: string) {
  const localUser = await db.query.users.findFirst({
    where: eq(users.workosUserId, workosUserId),
    columns: { id: true },
  });
  if (!localUser) {
    return;
  }
  await clearBackupCodes(localUser.id);
}

/**
 * Creates the TOTP factor for a sign-in that WorkOS answered with
 * `mfa_enrollment`, and binds the browser to its challenge. WorkOS only asks
 * for enrollment when no factor is live, so anything left from an earlier
 * factor is stale and would otherwise stop the new backup codes from being
 * issued after verification.
 */
export const beginTotpEnrollment = Effect.fn("auth.mfa.beginEnrollment")(
  function* (workosUserId: string, email: string) {
    yield* Effect.promise(() => forgetFactorState(workosUserId));
    const enrollment = yield* tryWorkOS(() =>
      createTotpFactor(workosUserId, email)
    );
    yield* rememberAttempt(workosUserId, enrollment.authenticationChallengeId);
    return enrollment;
  }
);

/**
 * Turns a WorkOS `mfa_challenge` / `mfa_enrollment` authentication error into
 * the next step of the sign-in flow. Returns `null` when the error is not an
 * MFA error so the caller can fall through to its generic handling.
 */
export const resolveMfaFlow = Effect.fn("auth.mfa.resolveFlow")(function* (
  info: WorkOSErrorInfo,
  email: string
) {
  const pendingAuthenticationToken = info.pendingAuthenticationToken;
  if (!pendingAuthenticationToken) {
    return null;
  }

  const resolvedEmail = email || info.email || "";

  if (info.code === MFA_ERROR_CODES.CHALLENGE) {
    const factor = info.authenticationFactors.find(
      (candidate) => candidate.type === TOTP_FACTOR_TYPE
    );

    if (!factor) {
      return null;
    }

    const authenticationChallengeId = yield* createMfaChallenge(factor.id);
    if (info.userId) {
      yield* rememberAttempt(info.userId, authenticationChallengeId);
    }
    const result: AuthFlowResult = {
      status: "mfa-required",
      pendingAuthenticationToken,
      authenticationChallengeId,
      email: resolvedEmail,
    };
    return result;
  }

  if (info.code === MFA_ERROR_CODES.ENROLLMENT && info.userId) {
    const enrollment = yield* beginTotpEnrollment(info.userId, resolvedEmail);
    const result: AuthFlowResult = {
      status: "mfa-enrollment-required",
      pendingAuthenticationToken,
      email: resolvedEmail,
      ...enrollment,
    };
    return result;
  }

  return null;
});
