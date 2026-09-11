"use server";

import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import {
  completePasskeyRegistrationInputSchema,
  removeAuthFactorInputSchema,
  removePasskeyInputSchema,
  verifySecurityChallengeInputSchema,
  verifyTotpEnrollmentInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import { workosErrorSchema } from "@notra/schemas/dashboard/auth/workos-error";
import type {
  PasskeySummary,
  TotpFactorSummary,
} from "@notra/ui/lib/security-types";
import type { Ratelimit } from "@upstash/ratelimit";
import { getWorkOS, withAuth } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";
import { headers } from "next/headers";
import type * as z from "zod";

import {
  SECURITY_ERROR_CODES,
  TOTP_FACTOR_TYPE,
  TOTP_ISSUER,
  WORKOS_WIDGETS_USER_PROFILE_PATH,
} from "@/constants/security";
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
import { SecurityActionError } from "@/lib/auth/errors";
import { getAuthSession } from "@/lib/auth/server";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { widgetsRequest } from "@/lib/auth/workos-widgets";
import type {
  CompletePasskeyRegistrationInput,
  RegenerateBackupCodesResult,
  RemoveAuthFactorInput,
  RemovePasskeyInput,
  SecurityActionResult,
  SecurityErrorCode,
  SecurityOverview,
  SendSecurityChallengeResult,
  StartPasskeyRegistrationResult,
  StartTotpEnrollmentResult,
  VerifySecurityChallengeInput,
  VerifyTotpEnrollmentInput,
  VerifyTotpEnrollmentResult,
  WidgetsAuthenticationInformationResponse,
  WidgetsRegisterPasskeyResponse,
  WidgetsSendVerificationResponse,
  WidgetsVerifyResponse,
} from "@/types/auth/security";
import { getClientIpFromHeaders, ratelimit } from "@/utils/ratelimit";

const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";
const INVALID_CODE_MESSAGE =
  "That code didn't work. Check your authenticator app and try again.";
const ELEVATED_ACCESS_MESSAGE = "Confirm it's you to continue.";

const securityError = (
  code: SecurityErrorCode,
  message: string,
  cause?: unknown
) => new SecurityActionError({ code, message, cause });

function describeWorkOSError(cause: unknown, fallback: string) {
  const parsed = workosErrorSchema.safeParse(cause);
  if (!parsed.success) {
    return fallback;
  }
  const { message } = readWorkOSError(cause);
  return message || fallback;
}

const tryWorkOS = <T>(run: () => Promise<T>, fallbackMessage: string) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      securityError(
        SECURITY_ERROR_CODES.UNKNOWN,
        describeWorkOSError(cause, fallbackMessage),
        cause
      ),
  });

const validateInput = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): Effect.Effect<z.output<Schema>, SecurityActionError> => {
  const result = schema.safeParse(input);
  if (!result.success) {
    return Effect.fail(
      securityError(
        SECURITY_ERROR_CODES.INVALID_INPUT,
        result.error.issues[0]?.message ?? "Invalid input"
      )
    );
  }
  return Effect.succeed(result.data);
};

function runSecurityAction<T>(
  effect: Effect.Effect<T, SecurityActionError>
): Promise<SecurityActionResult<T>> {
  return Effect.runPromise(
    effect.pipe(
      Effect.catchDefect((defect) =>
        Effect.fail(
          securityError(
            SECURITY_ERROR_CODES.UNKNOWN,
            "Something went wrong",
            defect
          )
        )
      ),
      Effect.match({
        onSuccess: (data): SecurityActionResult<T> => ({ data, error: null }),
        onFailure: (error): SecurityActionResult<T> => ({
          data: null,
          error: { message: error.message, code: error.code },
        }),
      })
    )
  );
}

const enforceRateLimit = (limiter: Ratelimit, key: string) =>
  Effect.gen(function* () {
    const skipInDevelopment =
      process.env.NODE_ENV !== "production" &&
      (!process.env.UPSTASH_REDIS_REST_URL ||
        !process.env.UPSTASH_REDIS_REST_TOKEN);
    if (skipInDevelopment) {
      return;
    }

    const headersList = yield* Effect.promise(() => headers());
    const ip = getClientIpFromHeaders(headersList);
    const { success } = yield* Effect.promise(() =>
      limiter.limit(`${ip}:${key}`)
    );
    if (!success) {
      return yield* Effect.fail(
        securityError(SECURITY_ERROR_CODES.UNKNOWN, RATE_LIMITED_MESSAGE)
      );
    }
  });

const requireSecurityContext = Effect.fn("auth.security.requireContext")(
  function* () {
    const session = yield* Effect.tryPromise({
      try: () => getAuthSession(),
      catch: (cause) =>
        securityError(
          SECURITY_ERROR_CODES.UNKNOWN,
          "Failed to load session",
          cause
        ),
    });

    if (!session) {
      return yield* Effect.fail(
        securityError(SECURITY_ERROR_CODES.UNAUTHORIZED, "Unauthorized")
      );
    }

    const workosUserId = session.user.workosUserId;
    if (!workosUserId) {
      return yield* Effect.fail(
        securityError(
          SECURITY_ERROR_CODES.UNAVAILABLE,
          "Security settings aren't available for this account yet."
        )
      );
    }

    const auth = yield* Effect.tryPromise({
      try: () => withAuth(),
      catch: (cause) =>
        securityError(
          SECURITY_ERROR_CODES.UNKNOWN,
          "Failed to read auth session",
          cause
        ),
    });

    if (!auth.user) {
      return yield* Effect.fail(
        securityError(
          SECURITY_ERROR_CODES.UNAUTHORIZED,
          "Your session has expired. Please sign in again."
        )
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

const requireElevatedAccess = Effect.fn("auth.security.requireElevated")(
  function* () {
    const token = yield* Effect.promise(readElevatedAccessToken);
    if (!token) {
      return yield* Effect.fail(
        securityError(
          SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED,
          ELEVATED_ACCESS_MESSAGE
        )
      );
    }
    return token;
  }
);

const clearElevatedAccessOnRejection = <T>(
  effect: Effect.Effect<T, SecurityActionError>
) =>
  effect.pipe(
    Effect.catch((error) =>
      error.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED
        ? Effect.promise(clearElevatedAccessToken).pipe(
            Effect.andThen(Effect.fail(error))
          )
        : Effect.fail(error)
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
  const factors = yield* tryWorkOS(
    () =>
      getWorkOS().multiFactorAuth.listUserAuthFactors({ userId: workosUserId }),
    "Failed to load authentication factors"
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
  const info = yield* widgetsRequest<WidgetsAuthenticationInformationResponse>({
    accessToken,
    method: "GET",
    path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/authentication-information`,
  });

  const passkeyMethod = info.data?.verificationMethods?.Passkey ?? null;
  return (passkeyMethod?.passKeys ?? []).map<PasskeySummary>((passkey) => ({
    id: passkey.id,
    name: passkey.name ?? null,
    createdAt: passkey.createdAt ?? passkey.created_at ?? null,
    lastUsedAt: null,
  }));
});

export async function getSecurityOverviewAction(): Promise<
  SecurityActionResult<SecurityOverview>
> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const totpFactors = yield* listTotpFactors(context.workosUserId);

      const passkeys = yield* fetchPasskeys(context.accessToken).pipe(
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
  SecurityActionResult<StartTotpEnrollmentResult>
> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();

      const enrollment = yield* tryWorkOS(
        () =>
          getWorkOS().multiFactorAuth.createUserAuthFactor({
            userId: context.workosUserId,
            type: TOTP_FACTOR_TYPE,
            totpIssuer: TOTP_ISSUER,
            totpUser: context.email,
          }),
        "Couldn't start two-factor setup"
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
): Promise<SecurityActionResult<VerifyTotpEnrollmentResult>> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateInput(
        verifyTotpEnrollmentInputSchema,
        rawInput
      );

      yield* enforceRateLimit(
        ratelimit.mfaVerify,
        input.authenticationChallengeId
      );

      const verification = yield* tryWorkOS(
        () =>
          getWorkOS().multiFactorAuth.verifyChallenge({
            authenticationChallengeId: input.authenticationChallengeId,
            code: input.code,
          }),
        INVALID_CODE_MESSAGE
      );

      if (!verification.valid) {
        return yield* Effect.fail(
          securityError(SECURITY_ERROR_CODES.INVALID_CODE, INVALID_CODE_MESSAGE)
        );
      }

      const backupCodes = yield* Effect.tryPromise({
        try: () => replaceBackupCodes(context.localUserId),
        catch: (cause) =>
          securityError(
            SECURITY_ERROR_CODES.UNKNOWN,
            "Two-factor is on, but backup codes couldn't be generated. Regenerate them from settings.",
            cause
          ),
      });

      yield* trackSecurityEvent(
        POSTHOG_EVENTS.MFA_FACTOR_ENROLLED,
        context.localUserId
      );

      return { verified: true as const, backupCodes };
    })
  );
}

export async function regenerateBackupCodesAction(): Promise<
  SecurityActionResult<RegenerateBackupCodesResult>
> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const factors = yield* listTotpFactors(context.workosUserId);
      if (factors.length === 0) {
        return yield* Effect.fail(
          securityError(
            SECURITY_ERROR_CODES.INVALID_INPUT,
            "Set up an authenticator app before generating backup codes."
          )
        );
      }

      const codes = yield* Effect.tryPromise({
        try: () => replaceBackupCodes(context.localUserId),
        catch: (cause) =>
          securityError(
            SECURITY_ERROR_CODES.UNKNOWN,
            "Couldn't generate backup codes. Please try again.",
            cause
          ),
      });

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
): Promise<SecurityActionResult<{ removed: true }>> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateInput(removeAuthFactorInputSchema, rawInput);

      const factors = yield* listTotpFactors(context.workosUserId);
      const ownsFactor = factors.some((factor) => factor.id === input.factorId);
      if (!ownsFactor) {
        return yield* Effect.fail(
          securityError(
            SECURITY_ERROR_CODES.INVALID_INPUT,
            "That authentication method no longer exists."
          )
        );
      }

      yield* tryWorkOS(
        () => getWorkOS().multiFactorAuth.deleteFactor(input.factorId),
        "Couldn't remove the authenticator app"
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
  SecurityActionResult<SendSecurityChallengeResult>
> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();

      yield* enforceRateLimit(
        ratelimit.securityChallenge,
        context.workosUserId
      );

      const response = yield* widgetsRequest<WidgetsSendVerificationResponse>({
        accessToken: context.accessToken,
        method: "POST",
        path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/send-verification`,
      });

      return { authenticationChallengeId: response.authenticationChallenge };
    })
  );
}

export async function verifySecurityChallengeAction(
  rawInput: VerifySecurityChallengeInput
): Promise<SecurityActionResult<{ verified: true }>> {
  return runSecurityAction(
    Effect.gen(function* () {
      const context = yield* requireSecurityContext();
      const input = yield* validateInput(
        verifySecurityChallengeInputSchema,
        rawInput
      );

      yield* enforceRateLimit(
        ratelimit.mfaVerify,
        input.authenticationChallengeId
      );

      const response = yield* widgetsRequest<WidgetsVerifyResponse>({
        accessToken: context.accessToken,
        method: "POST",
        path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/verify`,
        body: {
          code: input.code,
          authenticationChallengeId: input.authenticationChallengeId,
        },
      }).pipe(
        Effect.catch((error) =>
          Effect.fail(
            error.code === SECURITY_ERROR_CODES.INVALID_INPUT
              ? securityError(
                  SECURITY_ERROR_CODES.INVALID_CODE,
                  "That code didn't work. Check your email and try again."
                )
              : error
          )
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
  SecurityActionResult<StartPasskeyRegistrationResult>
> {
  return runSecurityAction(
    clearElevatedAccessOnRejection(
      Effect.gen(function* () {
        const context = yield* requireSecurityContext();
        const elevatedAccessToken = yield* requireElevatedAccess();

        const response = yield* widgetsRequest<WidgetsRegisterPasskeyResponse>({
          accessToken: context.accessToken,
          elevatedAccessToken,
          requiresElevatedAccess: true,
          method: "POST",
          path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/passkeys`,
        });

        return {
          challengeId: response.challengeId,
          options: response.options,
        };
      })
    )
  );
}

export async function completePasskeyRegistrationAction(
  rawInput: CompletePasskeyRegistrationInput
): Promise<SecurityActionResult<{ registered: true }>> {
  return runSecurityAction(
    clearElevatedAccessOnRejection(
      Effect.gen(function* () {
        const context = yield* requireSecurityContext();
        const input = yield* validateInput(
          completePasskeyRegistrationInputSchema,
          rawInput
        );
        const elevatedAccessToken = yield* requireElevatedAccess();

        yield* widgetsRequest<{ success?: boolean }>({
          accessToken: context.accessToken,
          elevatedAccessToken,
          requiresElevatedAccess: true,
          method: "POST",
          path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/passkeys/verify`,
          body: {
            challengeId: input.challengeId,
            response: input.response,
          },
        });

        yield* trackSecurityEvent(
          POSTHOG_EVENTS.PASSKEY_REGISTERED,
          context.localUserId
        );

        return { registered: true as const };
      })
    )
  );
}

export async function removePasskeyAction(
  rawInput: RemovePasskeyInput
): Promise<SecurityActionResult<{ removed: true }>> {
  return runSecurityAction(
    clearElevatedAccessOnRejection(
      Effect.gen(function* () {
        const context = yield* requireSecurityContext();
        const input = yield* validateInput(removePasskeyInputSchema, rawInput);
        const elevatedAccessToken = yield* requireElevatedAccess();

        yield* widgetsRequest<{ success?: boolean }>({
          accessToken: context.accessToken,
          elevatedAccessToken,
          requiresElevatedAccess: true,
          method: "DELETE",
          path: `${WORKOS_WIDGETS_USER_PROFILE_PATH}/passkeys/${encodeURIComponent(input.passkeyId)}`,
        });

        yield* trackSecurityEvent(
          POSTHOG_EVENTS.PASSKEY_REMOVED,
          context.localUserId
        );

        return { removed: true as const };
      })
    )
  );
}
