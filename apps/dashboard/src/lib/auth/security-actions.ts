"use server";

import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import {
  completePasskeyRegistrationInputSchema,
  removeAuthFactorInputSchema,
  removePasskeyInputSchema,
  verifySecurityChallengeInputSchema,
  verifyTotpEnrollmentInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import {
  widgetsAuthenticationInformationSchema,
  widgetsRegisterPasskeySchema,
  widgetsSendVerificationSchema,
  widgetsSuccessSchema,
  widgetsVerifySchema,
} from "@notra/schemas/dashboard/auth/workos-widgets";
import type {
  PasskeySummary,
  TotpFactorSummary,
} from "@notra/ui/lib/security-types";
import type { Ratelimit } from "@upstash/ratelimit";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";

import { ACTION_ERROR_CODES } from "@/constants/actions";
import {
  SECURITY_ERROR_CODES,
  TOTP_FACTOR_TYPE,
  TOTP_ISSUER,
  WORKOS_WIDGETS_USER_PROFILE_PATH,
} from "@/constants/security";
import { ActionFailure } from "@/lib/actions/errors";
import { runAction } from "@/lib/actions/run-action";
import { validateActionInput } from "@/lib/actions/validate-input";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import {
  clearBackupCodes,
  countRemainingBackupCodes,
  replaceBackupCodes,
} from "@/lib/auth/backup-codes";
import {
  clearElevatedAccessToken,
  readElevatedAccessToken,
  storeElevatedAccessToken,
} from "@/lib/auth/elevated-access";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { widgetsRequest } from "@/lib/auth/workos-widgets";
import { requireSession } from "@/lib/organizations/guards";
import type {
  CompletePasskeyRegistrationInput,
  RegenerateBackupCodesResult,
  RemoveAuthFactorInput,
  RemovePasskeyInput,
  SecurityOverview,
  SendSecurityChallengeResult,
  StartPasskeyRegistrationResult,
  StartTotpEnrollmentResult,
  VerifySecurityChallengeInput,
  VerifyTotpEnrollmentInput,
  VerifyTotpEnrollmentResult,
} from "@/types/auth/security";
import type { ActionResult } from "@/types/organizations/actions";
import { isRateLimited, ratelimit } from "@/utils/ratelimit";

const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";
const INVALID_TOTP_MESSAGE =
  "That code didn't work. Check your authenticator app and try again.";
const INVALID_EMAIL_CODE_MESSAGE =
  "That code didn't work. Check your email and try again.";
const userProfilePath = (suffix: string) =>
  `${WORKOS_WIDGETS_USER_PROFILE_PATH}/${suffix}`;

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

const enforceRateLimit = (limiter: Ratelimit, key: string) =>
  Effect.promise(() => isRateLimited(limiter, key)).pipe(
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

    const auth = yield* tryDb(() => withAuth(), "Failed to read auth session");
    if (!auth.user) {
      return yield* Effect.fail(
        new ActionFailure({
          code: ACTION_ERROR_CODES.UNAUTHORIZED,
          message: "Your session has expired. Please sign in again.",
        })
      );
    }

    return {
      localUserId: session.user.id,
      email: session.user.email,
      workosUserId,
      accessToken: auth.accessToken,
    };
  }
);

/**
 * Passkey endpoints need the elevated token from the email step-up. When it
 * is missing or WorkOS rejects it, the cookie is dropped so the client asks
 * for a fresh verification.
 */
const withElevatedAccess = <T>(
  run: (elevatedAccessToken: string) => Effect.Effect<T, ActionFailure>
) =>
  Effect.gen(function* () {
    const token = yield* Effect.promise(readElevatedAccessToken);
    if (!token) {
      return yield* Effect.fail(
        new ActionFailure({
          code: SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED,
          message: "Confirm it's you to continue.",
        })
      );
    }
    return yield* run(token);
  }).pipe(
    Effect.tapError((error) =>
      error.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED
        ? Effect.promise(clearElevatedAccessToken)
        : Effect.void
    )
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
    getWorkOS().multiFactorAuth.listUserAuthFactors({ userId: workosUserId })
  );
  return factors.data
    .filter((factor) => factor.type === TOTP_FACTOR_TYPE)
    .map<TotpFactorSummary>((factor) => ({
      id: factor.id,
      issuer: factor.totp?.issuer ?? null,
      createdAt: factor.createdAt,
    }));
});

const fetchPasskeys = Effect.fn("auth.security.fetchPasskeys")(function* (
  accessToken: string
) {
  const info = yield* widgetsRequest({
    accessToken,
    method: "GET",
    path: userProfilePath("authentication-information"),
    schema: widgetsAuthenticationInformationSchema,
  });
  const passkeys = info.data?.verificationMethods?.Passkey?.passKeys ?? [];
  return passkeys.map<PasskeySummary>((passkey) => ({
    id: passkey.id,
    name: passkey.name ?? null,
    createdAt: passkey.createdAt ?? null,
    lastUsedAt: null,
  }));
});

export async function getSecurityOverviewAction(): Promise<
  ActionResult<SecurityOverview>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();

      const [totpFactors, passkeys] = yield* Effect.all(
        [
          listTotpFactors(context.workosUserId),
          fetchPasskeys(context.accessToken).pipe(
            Effect.map((list) => ({ list, available: true })),
            Effect.catch((error) =>
              Effect.logWarning("Could not load passkeys from WorkOS").pipe(
                Effect.annotateLogs({
                  userId: context.localUserId,
                  code: error.code,
                  error: error.message,
                }),
                Effect.as({ list: [] as PasskeySummary[], available: false })
              )
            )
          ),
        ],
        { concurrency: "unbounded" }
      );

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
        passkeys: passkeys.list,
        passkeysAvailable: passkeys.available,
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
      const enrollment = yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.createUserAuthFactor({
          userId: context.workosUserId,
          type: TOTP_FACTOR_TYPE,
          totpIssuer: TOTP_ISSUER,
          totpUser: context.email,
        })
      );
      return {
        factorId: enrollment.authenticationFactor.id,
        authenticationChallengeId: enrollment.authenticationChallenge.id,
        qrCode: enrollment.authenticationFactor.totp.qrCode,
        secret: enrollment.authenticationFactor.totp.secret,
        otpauthUri: enrollment.authenticationFactor.totp.uri,
      };
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
      yield* enforceRateLimit(
        ratelimit.mfaVerify,
        input.authenticationChallengeId
      );

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

      // The factor is live from here on. If issuing codes fails the user
      // still ends up with 2FA on and can regenerate from settings.
      const backupCodes = yield* tryDb(
        () => replaceBackupCodes(context.localUserId),
        "Two-factor is on, but backup codes couldn't be generated. Regenerate them from settings."
      );
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_FACTOR_ENROLLED,
        context.localUserId
      );
      return { verified: true as const, backupCodes };
    })
  );
}

export async function regenerateBackupCodesAction(): Promise<
  ActionResult<RegenerateBackupCodesResult>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const factors = yield* listTotpFactors(context.workosUserId);
      if (factors.length === 0) {
        return yield* Effect.fail(
          new ActionFailure({
            message:
              "Set up an authenticator app before generating backup codes.",
          })
        );
      }
      const codes = yield* tryDb(
        () => replaceBackupCodes(context.localUserId),
        "Couldn't generate backup codes. Please try again."
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

      yield* tryWorkOS(() =>
        getWorkOS().multiFactorAuth.deleteFactor(input.factorId)
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

export async function sendSecurityChallengeAction(): Promise<
  ActionResult<SendSecurityChallengeResult>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      yield* enforceRateLimit(
        ratelimit.securityChallenge,
        context.workosUserId
      );
      const response = yield* widgetsRequest({
        accessToken: context.accessToken,
        method: "POST",
        path: userProfilePath("send-verification"),
        schema: widgetsSendVerificationSchema,
      });
      return { authenticationChallengeId: response.authenticationChallenge };
    })
  );
}

export async function verifySecurityChallengeAction(
  rawInput: VerifySecurityChallengeInput
): Promise<ActionResult<{ verified: true }>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        verifySecurityChallengeInputSchema,
        rawInput
      );
      yield* enforceRateLimit(
        ratelimit.mfaVerify,
        input.authenticationChallengeId
      );

      const response = yield* widgetsRequest({
        accessToken: context.accessToken,
        method: "POST",
        path: userProfilePath("verify"),
        body: {
          code: input.code,
          authenticationChallengeId: input.authenticationChallengeId,
        },
        schema: widgetsVerifySchema,
      }).pipe(
        Effect.mapError((error) =>
          error.code === ACTION_ERROR_CODES.INVALID_INPUT
            ? new ActionFailure({
                code: SECURITY_ERROR_CODES.INVALID_CODE,
                message: INVALID_EMAIL_CODE_MESSAGE,
              })
            : error
        )
      );

      yield* Effect.promise(() =>
        storeElevatedAccessToken(
          response.elevatedAccessToken,
          response.expiresAt
        )
      );
      return { verified: true as const };
    })
  );
}

export async function startPasskeyRegistrationAction(): Promise<
  ActionResult<StartPasskeyRegistrationResult>
> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const response = yield* withElevatedAccess((elevatedAccessToken) =>
        widgetsRequest({
          accessToken: context.accessToken,
          elevatedAccessToken,
          method: "POST",
          path: userProfilePath("passkeys"),
          schema: widgetsRegisterPasskeySchema,
        })
      );
      return {
        challengeId: response.challengeId,
        options:
          response.options as unknown as PublicKeyCredentialCreationOptionsJSON,
      };
    })
  );
}

export async function completePasskeyRegistrationAction(
  rawInput: CompletePasskeyRegistrationInput
): Promise<ActionResult<{ registered: true }>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        completePasskeyRegistrationInputSchema,
        rawInput
      );
      yield* withElevatedAccess((elevatedAccessToken) =>
        widgetsRequest({
          accessToken: context.accessToken,
          elevatedAccessToken,
          method: "POST",
          path: userProfilePath("passkeys/verify"),
          body: { challengeId: input.challengeId, response: input.response },
          schema: widgetsSuccessSchema,
        })
      );
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.PASSKEY_REGISTERED,
        context.localUserId
      );
      return { registered: true as const };
    })
  );
}

export async function removePasskeyAction(
  rawInput: RemovePasskeyInput
): Promise<ActionResult<{ removed: true }>> {
  return runAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateActionInput(
        removePasskeyInputSchema,
        rawInput
      );
      yield* withElevatedAccess((elevatedAccessToken) =>
        widgetsRequest({
          accessToken: context.accessToken,
          elevatedAccessToken,
          method: "DELETE",
          path: userProfilePath(
            `passkeys/${encodeURIComponent(input.passkeyId)}`
          ),
          schema: widgetsSuccessSchema,
        })
      );
      yield* trackSecurityEvent(
        POSTHOG_EVENTS.PASSKEY_REMOVED,
        context.localUserId
      );
      return { removed: true as const };
    })
  );
}
