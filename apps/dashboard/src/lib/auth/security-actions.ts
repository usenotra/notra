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
import { getWorkOS } from "@workos/authkit-session";
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
import { getTranslations } from "@/lib/i18n/server";
import { requireSession } from "@/lib/organizations/guards";
import type { ActionResult } from "@/types/organizations/actions";
import { isAccountRateLimited, ratelimit } from "@/utils/ratelimit";

const securityTranslations = Effect.promise(() =>
  getTranslations("errors.actions.security")
);

const sharedErrorTranslations = Effect.promise(() =>
  getTranslations("errors.shared")
);

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
        ? sharedErrorTranslations.pipe(
            Effect.flatMap((t) =>
              Effect.fail(
                new ActionFailure({ message: t("tooManyAttemptsPleaseTry") })
              )
            )
          )
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
          message: (yield* securityTranslations)("unavailable"),
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
            message: (yield* securityTranslations)("invalidConfirmation"),
          })
        );
      }
      return null;
    }
    const backupCode = normalizeBackupCode(code);
    const unused = yield* tryDb(
      () => hasUnusedBackupCode(context.localUserId, backupCode),
      (yield* securityTranslations)("backupCheckFailed")
    );
    if (!unused) {
      return yield* Effect.fail(
        new ActionFailure({
          code: SECURITY_ERROR_CODES.INVALID_CODE,
          message: (yield* securityTranslations)("invalidConfirmation"),
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

export async function getSecurityOverview(): Promise<
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

export async function startTotpEnrollment(): Promise<
  ActionResult<StartTotpEnrollmentResult>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const existing = yield* listTotpFactors(context.workosUserId);
      if (existing.length > 0) {
        return yield* Effect.fail(
          new ActionFailure({
            message: (yield* securityTranslations)("alreadyEnabled"),
          })
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

export async function discardTotpEnrollment(
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

export async function verifyTotpEnrollment(
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
          new ActionFailure({
            message: (yield* securityTranslations)("enrollmentExpired"),
          })
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
            message: (yield* securityTranslations)("invalidTotp"),
          })
        );
      }
      if (verification.challenge.authenticationFactorId !== input.factorId) {
        return yield* Effect.fail(
          new ActionFailure({
            message: (yield* securityTranslations)("enrollmentExpired"),
          })
        );
      }
      yield* Effect.promise(clearTotpEnrollmentInProgress);

      const backupCodes = yield* attemptDb(() =>
        replaceBackupCodes(context.localUserId)
      );
      const warning =
        backupCodes === null
          ? (yield* securityTranslations)("backupCodesWarning")
          : null;
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_FACTOR_ENROLLED,
        context.localUserId
      );
      return {
        verified: true as const,
        backupCodes,
        warning,
      };
    })
  );
}

export async function regenerateBackupCodes(
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
            message: (yield* securityTranslations)("setupBeforeBackupCodes"),
          })
        );
      }
      const codes = yield* withSecondFactor(
        context,
        factors,
        input.confirmationCode,
        tryDb(
          () => replaceBackupCodes(context.localUserId),
          (yield* securityTranslations)("backupCodesFailed")
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

export async function removeAuthFactor(
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
            message: (yield* securityTranslations)("factorMissing"),
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
