import { createServerFn } from "@tanstack/react-start";

const verifyMfaCodeServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: Parameters<typeof verifyMfaCodeActionImpl>) => data)
  .handler(({ data }) => verifyMfaCodeActionImpl(...data));
export const verifyMfaCodeAction = (
  ...data: Parameters<typeof verifyMfaCodeActionImpl>
) => verifyMfaCodeServerFn({ data });

const redeemBackupCodeServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: Parameters<typeof redeemBackupCodeActionImpl>) => data)
  .handler(({ data }) => redeemBackupCodeActionImpl(...data));
export const redeemBackupCodeAction = (
  ...data: Parameters<typeof redeemBackupCodeActionImpl>
) => redeemBackupCodeServerFn({ data });

const resumeSocialEnrollmentServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: Parameters<typeof resumeSocialEnrollmentActionImpl>) => data
  )
  .handler(({ data }) => resumeSocialEnrollmentActionImpl(...data));
export const resumeSocialEnrollmentAction = (
  ...data: Parameters<typeof resumeSocialEnrollmentActionImpl>
) => resumeSocialEnrollmentServerFn({ data });

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
import { getWorkOS } from "@workos/authkit-session";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import { ANALYTICS_AUTH_METHODS } from "@/constants/analytics-events";
import { TOTP_FACTOR_TYPE } from "@/constants/security";
import {
  authActionMessage,
  workOSFailureMessage,
} from "@/lib/auth/action-messages";
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

async function verifyMfaCodeActionImpl(
  rawInput: VerifyMfaCodeInput
): Promise<AuthFlowResult> {
  const parsed = verifyMfaCodeInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("invalidCode"),
    };
  }

  const attempt = await readMatchingAttempt(
    parsed.data.authenticationChallengeId
  );
  if (!attempt) {
    return {
      status: "error",
      message: await authActionMessage("attemptExpired"),
    };
  }
  if (await isMfaVerifyRateLimited(attempt)) {
    return { status: "error", message: await authActionMessage("rateLimited") };
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

async function redeemBackupCodeActionImpl(
  rawInput: RedeemBackupCodeInput
): Promise<RedeemBackupCodeResult> {
  const parsed = redeemBackupCodeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("backupCodeRejected"),
    };
  }

  const attempt = await readMatchingAttempt(
    parsed.data.authenticationChallengeId
  );
  if (!attempt) {
    return {
      status: "error",
      message: await authActionMessage("attemptExpired"),
    };
  }
  const { workosUserId, startedAt } = attempt;

  if (await isAccountRateLimited(ratelimit.backupCode, workosUserId)) {
    return { status: "error", message: await authActionMessage("rateLimited") };
  }

  const rejected: RedeemBackupCodeResult = {
    status: "error",
    message: await authActionMessage("backupCodeRejected"),
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
        Effect.promise(() =>
          workOSFailureMessage(readWorkOSError(error.error))
        ).pipe(
          Effect.map((message): RedeemBackupCodeResult => ({
            status: "error",
            message,
          }))
        )
      )
    )
  );
}

async function resumeSocialEnrollmentActionImpl(
  rawInput: ResumeSocialEnrollmentInput
): Promise<AuthFlowResult> {
  const parsed = resumeSocialEnrollmentInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("attemptExpired"),
    };
  }

  const flow = await readPendingMfaFlow(parsed.data.flowId);
  if (flow?.kind !== "enrollment") {
    return {
      status: "error",
      message: await authActionMessage("attemptExpired"),
    };
  }
  if (
    await isAccountRateLimited(
      ratelimit.signIn,
      `enrollment:${flow.workosUserId}`
    )
  ) {
    return { status: "error", message: await authActionMessage("rateLimited") };
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
