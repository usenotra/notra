"use server";

import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  redeemBackupCodeInputSchema,
  resumeSocialEnrollmentInputSchema,
  verifyMfaCodeInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import type {
  AuthFlowResult,
  RedeemBackupCodeInput,
  RedeemBackupCodeResult,
  ResumeSocialEnrollmentInput,
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
  consumeBackupCode,
  hasBackupCodes,
  hasUnusedBackupCode,
  replaceBackupCodes,
} from "@/lib/auth/backup-codes";
import { beginTotpEnrollment } from "@/lib/auth/mfa";
import {
  clearAllPendingMfaFlows,
  clearMfaAttemptCookie,
  clearPendingMfaFlow,
  readMfaAttempt,
  readPendingMfaFlow,
} from "@/lib/auth/mfa-cookies";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { readWorkOSError } from "@/lib/auth/workos-error";
import type { MfaAttempt } from "@/types/auth/mfa-cookies";
import { isAccountRateLimited, ratelimit } from "@/utils/ratelimit";

const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";
const ATTEMPT_EXPIRED_MESSAGE =
  "This sign-in attempt expired. Please start again.";
const BACKUP_CODE_REJECTED_MESSAGE =
  "That backup code isn't valid or was already used.";

async function isMfaVerifyRateLimited(attempt: MfaAttempt) {
  if (
    await isAccountRateLimited(
      ratelimit.mfaVerify,
      `challenge:${attempt.authenticationChallengeId}`
    )
  ) {
    return true;
  }
  return isAccountRateLimited(
    ratelimit.mfaVerify,
    `user:${attempt.workosUserId}`
  );
}

async function readMatchingAttempt(authenticationChallengeId: string) {
  const attempt = await readMfaAttempt();
  return attempt?.authenticationChallengeId === authenticationChallengeId
    ? attempt
    : null;
}

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

  const attempt = await readMatchingAttempt(
    parsed.data.authenticationChallengeId
  );
  if (!attempt) {
    return { status: "error", message: ATTEMPT_EXPIRED_MESSAGE };
  }
  if (await isMfaVerifyRateLimited(attempt)) {
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
      yield* Effect.promise(clearMfaAttemptCookie);
      yield* Effect.promise(clearAllPendingMfaFlows);

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

  const attempt = await readMatchingAttempt(
    parsed.data.authenticationChallengeId
  );
  if (!attempt) {
    return { status: "error", message: ATTEMPT_EXPIRED_MESSAGE };
  }
  const { workosUserId, startedAt } = attempt;

  if (await isAccountRateLimited(ratelimit.backupCode, workosUserId)) {
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

      const unused = yield* Effect.promise(() =>
        hasUnusedBackupCode(localUser.id, parsed.data.code)
      );
      if (!unused) {
        return rejected;
      }

      const removeLockedOutFactors = Effect.gen(function* () {
        const factors = yield* tryWorkOSAuth(() =>
          getWorkOS().multiFactorAuth.listUserAuthFactors({
            userId: workosUserId,
          })
        );
        const totpFactors = factors.data.filter(
          (factor) => factor.type === TOTP_FACTOR_TYPE
        );
        const lockedOutFactors = totpFactors.filter(
          (factor) => Date.parse(factor.createdAt) <= startedAt
        );
        yield* Effect.forEach(
          lockedOutFactors,
          (factor) =>
            tryWorkOSAuth(() =>
              getWorkOS().multiFactorAuth.deleteFactor(factor.id)
            ),
          { discard: true }
        );
        return lockedOutFactors.length === totpFactors.length;
      });
      const allFactorsRemoved = yield* removeLockedOutFactors;
      yield* Effect.promise(() =>
        consumeBackupCode(localUser.id, parsed.data.code)
      );

      if (allFactorsRemoved) {
        yield* Effect.promise(() => clearBackupCodes(localUser.id));
      }
      yield* Effect.promise(clearMfaAttemptCookie);
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

export async function resumeSocialEnrollmentAction(
  rawInput: ResumeSocialEnrollmentInput
): Promise<AuthFlowResult> {
  const parsed = resumeSocialEnrollmentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", message: ATTEMPT_EXPIRED_MESSAGE };
  }

  const flow = await readPendingMfaFlow(parsed.data.flowId);
  if (flow?.kind !== "enrollment") {
    return { status: "error", message: ATTEMPT_EXPIRED_MESSAGE };
  }
  if (
    await isAccountRateLimited(
      ratelimit.signIn,
      `enrollment:${flow.workosUserId}`
    )
  ) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }
  await clearPendingMfaFlow(parsed.data.flowId);

  return runAuthFlow(
    flow.email,
    Effect.gen(function* () {
      const enrollment = yield* beginTotpEnrollment(
        flow.workosUserId,
        flow.email
      );
      yield* Effect.promise(() =>
        trackAuthEvent(POSTHOG_EVENTS.MFA_ENROLLMENT_REQUIRED, {
          method: ANALYTICS_AUTH_METHODS.UNKNOWN,
        })
      );
      const result: AuthFlowResult = {
        status: "mfa-enrollment-required",
        pendingAuthenticationToken: flow.pendingAuthenticationToken,
        email: flow.email,
        ...enrollment,
      };
      return result;
    })
  );
}
