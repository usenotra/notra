"use server";

import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  redeemBackupCodeInputSchema,
  verifyMfaCodeInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import type {
  AuthFlowResult,
  RedeemBackupCodeInput,
  RedeemBackupCodeResult,
  VerifyMfaCodeInput,
} from "@notra/schemas/types/dashboard/auth";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { ANALYTICS_AUTH_METHODS } from "@/constants/analytics-events";
import { TOTP_FACTOR_TYPE } from "@/constants/security";
import {
  completeAuthentication,
  getWorkOSClientId,
  runAuthFlow,
  signedIn,
  trackAuthEvent,
  tryWorkOSAuth,
} from "@/lib/auth/auth-flow";
import {
  clearBackupCodes,
  hasBackupCodes,
  hasUnusedBackupCode,
  replaceBackupCodes,
} from "@/lib/auth/backup-codes";
import { clearFactorLabels, setFactorLabel } from "@/lib/auth/factor-labels";
import { clearMfaCookies, readMfaAttempt } from "@/lib/auth/mfa-cookies";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { readWorkOSError } from "@/lib/auth/workos-error";
import type { MfaAttempt } from "@/types/auth/mfa-cookies";
import { isRateLimited, ratelimit } from "@/utils/ratelimit";

const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";
const ATTEMPT_EXPIRED_MESSAGE =
  "This sign-in attempt expired. Please start again.";
const BACKUP_CODE_REJECTED_MESSAGE =
  "That backup code isn't valid or was already used.";

/**
 * Every password attempt mints a fresh challenge, so limiting by challenge id
 * alone would hand out a new guess budget per attempt. The attempt cookie
 * adds a stable per-account key on top.
 */
async function isMfaVerifyRateLimited(
  authenticationChallengeId: string,
  attempt: MfaAttempt | null
) {
  if (await isRateLimited(ratelimit.mfaVerify, authenticationChallengeId)) {
    return true;
  }
  return attempt
    ? isRateLimited(ratelimit.mfaVerify, `user:${attempt.workosUserId}`)
    : false;
}

/**
 * Best-effort bookkeeping after the session already exists. A database
 * failure must not report the sign-in as failed, so it is logged and the
 * user can regenerate or rename from settings.
 */
const attemptAfterSignIn = <T>(run: () => Promise<T>, what: string) =>
  Effect.tryPromise(run).pipe(
    Effect.catch((error) =>
      Effect.logWarning(`MFA sign-in succeeded but ${what} failed`).pipe(
        Effect.annotateLogs({ error: String(error.cause) }),
        Effect.as<T | null>(null)
      )
    )
  );

export async function verifyMfaCodeAction(
  rawInput: VerifyMfaCodeInput
): Promise<AuthFlowResult> {
  const parsed = verifyMfaCodeInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid code",
    };
  }

  const attempt = await readMfaAttempt();
  if (
    await isMfaVerifyRateLimited(parsed.data.authenticationChallengeId, attempt)
  ) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  return runAuthFlow(
    "",
    Effect.gen(function* () {
      const response = yield* authenticateResolvingOrgSelection(() =>
        getWorkOS().userManagement.authenticateWithTotp({
          clientId: getWorkOSClientId(),
          code: parsed.data.code,
          pendingAuthenticationToken: parsed.data.pendingAuthenticationToken,
          authenticationChallengeId: parsed.data.authenticationChallengeId,
        })
      );

      const session = yield* completeAuthentication(
        response,
        parsed.data.returnTo,
        POSTHOG_EVENTS.MFA_VERIFIED
      );
      yield* Effect.promise(clearMfaCookies);

      // The session is live from here on: nothing below may turn the result
      // into an error, or the client would show a failure for a signed-in user.
      const factorId = parsed.data.factorLabel?.factorId;
      const factorName = parsed.data.factorLabel?.name;
      if (factorId && factorName) {
        yield* attemptAfterSignIn(async () => {
          const factors = await getWorkOS().multiFactorAuth.listUserAuthFactors(
            { userId: response.user.id }
          );
          if (factors.data.some((factor) => factor.id === factorId)) {
            await setFactorLabel(session.localUserId, factorId, factorName);
          }
        }, "saving the factor name");
      }

      const alreadyHasCodes = yield* attemptAfterSignIn(
        () => hasBackupCodes(session.localUserId),
        "checking backup codes"
      );
      if (alreadyHasCodes !== false) {
        return signedIn(session);
      }

      const backupCodes = yield* attemptAfterSignIn(
        () => replaceBackupCodes(session.localUserId),
        "issuing backup codes"
      );
      if (!backupCodes) {
        return signedIn(session);
      }
      return {
        status: "enrolled" as const,
        redirectTo: session.redirectTo,
        backupCodes,
      };
    })
  );
}

export async function redeemBackupCodeAction(
  rawInput: RedeemBackupCodeInput
): Promise<RedeemBackupCodeResult> {
  const parsed = redeemBackupCodeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid backup code",
    };
  }

  // The cookie is browser-wide, so a second attempt in another tab replaces
  // it. Requiring the challenge shown on screen keeps the code from being
  // checked against, and the factors removed from, a different account.
  const attempt = await readMfaAttempt();
  if (
    !attempt ||
    attempt.authenticationChallengeId !== parsed.data.authenticationChallengeId
  ) {
    return { status: "error", message: ATTEMPT_EXPIRED_MESSAGE };
  }
  const { workosUserId } = attempt;

  if (await isRateLimited(ratelimit.backupCode, workosUserId)) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const rejected: RedeemBackupCodeResult = {
    status: "error",
    message: BACKUP_CODE_REJECTED_MESSAGE,
  };

  return Effect.runPromise(
    Effect.gen(function* () {
      const localUser = yield* Effect.promise(() =>
        db.query.users.findFirst({
          where: eq(users.workosUserId, workosUserId),
          columns: { id: true, email: true },
        })
      );
      if (!localUser) {
        return rejected;
      }

      const matches = yield* Effect.promise(() =>
        hasUnusedBackupCode(localUser.id, parsed.data.code)
      );
      if (!matches) {
        return rejected;
      }

      const factors = yield* tryWorkOSAuth(() =>
        getWorkOS().multiFactorAuth.listUserAuthFactors({
          userId: workosUserId,
        })
      );
      yield* Effect.forEach(
        factors.data.filter((factor) => factor.type === TOTP_FACTOR_TYPE),
        (factor) =>
          tryWorkOSAuth(() =>
            getWorkOS().multiFactorAuth.deleteFactor(factor.id)
          ),
        { discard: true }
      );

      yield* Effect.promise(() => clearBackupCodes(localUser.id));
      yield* Effect.promise(() => clearFactorLabels(localUser.id));
      yield* Effect.promise(clearMfaCookies);
      yield* Effect.promise(() =>
        trackAuthEvent(
          POSTHOG_EVENTS.MFA_BACKUP_CODE_USED,
          { method: ANALYTICS_AUTH_METHODS.PASSWORD },
          localUser.id
        )
      );
      return {
        status: "recovered" as const,
        email: localUser.email,
      };
    }).pipe(
      Effect.catch((error) =>
        Effect.succeed<RedeemBackupCodeResult>({
          status: "error",
          message: readWorkOSError(error.error).message,
        })
      )
    )
  );
}
