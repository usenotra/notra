"use server";

import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import { TOTP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import {
  discardTotpEnrollmentInputSchema,
  regenerateBackupCodesInputSchema,
  removeAuthFactorInputSchema,
  verifyTotpEnrollmentInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import type {
  DiscardTotpEnrollmentInput,
  RegenerateBackupCodesInput,
  RegenerateBackupCodesResult,
  RemoveAuthFactorInput,
  SecurityOverview,
  StartTotpEnrollmentResult,
  TotpFactorSummary,
  VerifyTotpEnrollmentInput,
  VerifyTotpEnrollmentResult,
} from "@notra/schemas/types/dashboard/auth";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
import type { Ratelimit } from "@upstash/ratelimit";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";

import { SECURITY_ERROR_CODES, TOTP_FACTOR_TYPE } from "@/constants/security";
import { ActionFailure } from "@/lib/actions/errors";
import { runAction } from "@/lib/actions/run-action";
import { validateActionInput } from "@/lib/actions/validate-input";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import {
  clearBackupCodes,
  consumeBackupCode,
  countRemainingBackupCodes,
  hasUnusedBackupCode,
  replaceBackupCodes,
} from "@/lib/auth/backup-codes";
import {
  clearTotpEnrollmentInProgress,
  readTotpEnrollmentInProgress,
  storeTotpEnrollmentInProgress,
} from "@/lib/auth/mfa-cookies";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { createTotpFactor } from "@/lib/auth/workos-mfa";
import { requireSession } from "@/lib/organizations/guards";
import type { ActionResult } from "@/types/organizations/actions";
import { isAccountRateLimited, ratelimit } from "@/utils/ratelimit";

const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";
const INVALID_TOTP_MESSAGE =
  "That code didn't work. Check your authenticator app and try again.";
const INVALID_CONFIRMATION_MESSAGE =
  "That code didn't work. Enter the code from your authenticator app or an unused backup code.";
const ENROLLMENT_EXPIRED_MESSAGE =
  "This setup expired or belongs to another session. Start the setup again.";
const ALREADY_ENABLED_MESSAGE =
  "Two-factor authentication is already on. Remove the current authenticator app before adding another.";

const tryWorkOS = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new ActionFailure({ message: readWorkOSError(cause).message, cause }),
  });

const tryDb = <T>(run: () => Promise<T>, message: string) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new ActionFailure({ message, cause }),
  });

const attemptDb = <T>(run: () => Promise<T>) =>
  Effect.tryPromise(run).pipe(
    Effect.catch((error) =>
      Effect.logWarning("Security bookkeeping failed after enrollment").pipe(
        Effect.annotateLogs({ error: String(error.cause) }),
        Effect.as<T | null>(null)
      )
    )
  );

const enforceRateLimit = (limiter: Ratelimit, key: string) =>
  Effect.promise(() => isAccountRateLimited(limiter, key)).pipe(
    Effect.andThen((limited) =>
      limited
        ? Effect.fail(new ActionFailure({ message: RATE_LIMITED_MESSAGE }))
        : Effect.void
    )
  );

const requireSecurityContext = Effect.fn("auth.security.requireContext")(
  function* () {
    const session = yield* requireSession();
    const workosUserId = session.user.workosUserId;
    if (!workosUserId) {
      return yield* Effect.fail(
        new ActionFailure({
          code: SECURITY_ERROR_CODES.UNAVAILABLE,
          message: "Security settings aren't available for this account yet.",
        })
      );
    }

    return {
      localUserId: session.user.id,
      email: session.user.email,
      workosUserId,
    };
  }
);

const trackSecurityEvent = (event: PostHogEventName, userId: string) =>
  Effect.promise(async () => {
    const requestHeaders = await readRequestHeaders();
    trackServerEvent({ event, headers: requestHeaders, userId });
  });

const listTotpFactors = Effect.fn("auth.security.listTotpFactors")(function* (
  workosUserId: string
) {
  const factors = yield* tryWorkOS(() =>
    getWorkOS().multiFactorAuth.listUserAuthFactors({
      userId: workosUserId,
    })
  );
  return factors.data
    .filter((factor) => factor.type === TOTP_FACTOR_TYPE)
    .map<TotpFactorSummary>((factor) => ({
      id: factor.id,
      issuer: factor.totp?.issuer ?? null,
      createdAt: factor.createdAt,
    }));
});

interface SecurityContext {
  localUserId: string;
  email: string;
  workosUserId: string;
}

const isTotpCode = (code: string) =>
  code.length === TOTP_CODE_LENGTH && /^\d+$/.test(code);

const verifyTotpAgainstFactors = Effect.fn("auth.security.verifyTotp")(
  function* (factors: TotpFactorSummary[], code: string) {
    for (const factor of factors) {
      const challenge = yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.challengeFactor({
          authenticationFactorId: factor.id,
        })
      );
      const verification = yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.verifyChallenge({
          authenticationChallengeId: challenge.id,
          code,
        })
      ).pipe(Effect.catch(() => Effect.succeed({ valid: false })));
      if (verification.valid) {
        return true;
      }
    }
    return false;
  }
);

const confirmSecondFactor = Effect.fn("auth.security.confirmSecondFactor")(
  function* (
    context: SecurityContext,
    factors: TotpFactorSummary[],
    code: string
  ) {
    yield* enforceRateLimit(
      ratelimit.mfaVerify,
      `confirm:${context.localUserId}`
    );
    if (isTotpCode(code)) {
      const confirmed = yield* verifyTotpAgainstFactors(factors, code);
      if (!confirmed) {
        return yield* Effect.fail(
          new ActionFailure({
            code: SECURITY_ERROR_CODES.INVALID_CODE,
            message: INVALID_CONFIRMATION_MESSAGE,
          })
        );
      }
      return null;
    }
    const backupCode = normalizeBackupCode(code);
    const unused = yield* tryDb(
      () => hasUnusedBackupCode(context.localUserId, backupCode),
      "Couldn't check the backup code. Please try again."
    );
    if (!unused) {
      return yield* Effect.fail(
        new ActionFailure({
          code: SECURITY_ERROR_CODES.INVALID_CODE,
          message: INVALID_CONFIRMATION_MESSAGE,
        })
      );
    }
    return backupCode;
  }
);

const withSecondFactor = <A>(
  context: SecurityContext,
  factors: TotpFactorSummary[],
  code: string,
  change: Effect.Effect<A, ActionFailure>
) =>
  Effect.gen(function* () {
    const backupCode = yield* confirmSecondFactor(context, factors, code);
    return yield* change.pipe(
      Effect.tap(() =>
        backupCode
          ? Effect.promise(() =>
              consumeBackupCode(context.localUserId, backupCode)
            ).pipe(Effect.ignore)
          : Effect.void
      )
    );
  });

export async function getSecurityOverviewAction(): Promise<
  ActionResult<SecurityOverview>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();

      const totpFactors = yield* listTotpFactors(context.workosUserId);
      const backupCodesRemaining =
        totpFactors.length > 0
          ? yield* Effect.promise(() =>
              countRemainingBackupCodes(context.localUserId)
            )
          : 0;

      return {
        email: context.email,
        totpFactors,
        backupCodesRemaining,
      };
    })
  );
}

export async function startTotpEnrollmentAction(): Promise<
  ActionResult<StartTotpEnrollmentResult>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const existing = yield* listTotpFactors(context.workosUserId);
      if (existing.length > 0) {
        return yield* Effect.fail(
          new ActionFailure({ message: ALREADY_ENABLED_MESSAGE })
        );
      }
      const enrollment = yield* tryWorkOS(() =>
        createTotpFactor(context.workosUserId, context.email)
      );
      yield* Effect.promise(() =>
        storeTotpEnrollmentInProgress({
          localUserId: context.localUserId,
          factorId: enrollment.factorId,
          authenticationChallengeId: enrollment.authenticationChallengeId,
        })
      );
      return enrollment;
    })
  );
}

export async function discardTotpEnrollmentAction(
  rawInput: DiscardTotpEnrollmentInput
): Promise<ActionResult<{ discarded: boolean }>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        discardTotpEnrollmentInputSchema,
        rawInput
      );
      const inProgress = yield* Effect.promise(readTotpEnrollmentInProgress);
      if (
        inProgress?.localUserId !== context.localUserId ||
        inProgress.factorId !== input.factorId
      ) {
        return { discarded: false };
      }
      yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.deleteFactor(input.factorId)
      );
      yield* Effect.promise(clearTotpEnrollmentInProgress);
      return { discarded: true };
    })
  );
}

export async function verifyTotpEnrollmentAction(
  rawInput: VerifyTotpEnrollmentInput
): Promise<ActionResult<VerifyTotpEnrollmentResult>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        verifyTotpEnrollmentInputSchema,
        rawInput
      );
      yield* enforceRateLimit(ratelimit.mfaVerify, context.localUserId);

      const inProgress = yield* Effect.promise(readTotpEnrollmentInProgress);
      const isOwnEnrollment =
        inProgress?.localUserId === context.localUserId &&
        inProgress.factorId === input.factorId &&
        inProgress.authenticationChallengeId ===
          input.authenticationChallengeId;
      if (!isOwnEnrollment) {
        return yield* Effect.fail(
          new ActionFailure({ message: ENROLLMENT_EXPIRED_MESSAGE })
        );
      }

      const verification = yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.verifyChallenge({
          authenticationChallengeId: input.authenticationChallengeId,
          code: input.code,
        })
      );
      if (!verification.valid) {
        return yield* Effect.fail(
          new ActionFailure({
            code: SECURITY_ERROR_CODES.INVALID_CODE,
            message: INVALID_TOTP_MESSAGE,
          })
        );
      }
      if (verification.challenge.authenticationFactorId !== input.factorId) {
        return yield* Effect.fail(
          new ActionFailure({ message: ENROLLMENT_EXPIRED_MESSAGE })
        );
      }
      yield* Effect.promise(clearTotpEnrollmentInProgress);

      const warnings: string[] = [];
      const backupCodes = yield* attemptDb(() =>
        replaceBackupCodes(context.localUserId)
      );
      if (backupCodes === null) {
        warnings.push(
          "backup codes couldn't be generated. Regenerate them from settings"
        );
      }
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_FACTOR_ENROLLED,
        context.localUserId
      );
      return {
        verified: true as const,
        backupCodes,
        warning:
          warnings.length > 0
            ? `Two-factor is on, but ${warnings.join(" and ")}.`
            : null,
      };
    })
  );
}

export async function regenerateBackupCodesAction(
  rawInput: RegenerateBackupCodesInput
): Promise<ActionResult<RegenerateBackupCodesResult>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        regenerateBackupCodesInputSchema,
        rawInput
      );
      const factors = yield* listTotpFactors(context.workosUserId);
      if (factors.length === 0) {
        return yield* Effect.fail(
          new ActionFailure({
            message:
              "Set up an authenticator app before generating backup codes.",
          })
        );
      }
      const codes = yield* withSecondFactor(
        context,
        factors,
        input.confirmationCode,
        tryDb(
          () => replaceBackupCodes(context.localUserId),
          "Couldn't generate backup codes. Please try again."
        )
      );
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_BACKUP_CODES_REGENERATED,
        context.localUserId
      );
      return { codes };
    })
  );
}

export async function removeAuthFactorAction(
  rawInput: RemoveAuthFactorInput
): Promise<ActionResult<{ removed: true }>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        removeAuthFactorInputSchema,
        rawInput
      );

      const factors = yield* listTotpFactors(context.workosUserId);
      if (!factors.some((factor) => factor.id === input.factorId)) {
        return yield* Effect.fail(
          new ActionFailure({
            message: "That authentication method no longer exists.",
          })
        );
      }
      yield* withSecondFactor(
        context,
        factors,
        input.confirmationCode,
        tryWorkOS(() =>
          getWorkOS().multiFactorAuth.deleteFactor(input.factorId)
        )
      );
      if (factors.length === 1) {
        yield* Effect.promise(() => clearBackupCodes(context.localUserId));
      }
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_FACTOR_REMOVED,
        context.localUserId
      );
      return { removed: true as const };
    })
  );
}
