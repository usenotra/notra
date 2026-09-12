"use server";

import { db } from "@notra/db/drizzle";
import { users } from "@notra/db/schema";
import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInWithPasswordInputSchema,
  signUpWithPasswordInputSchema,
  verifyEmailCodeInputSchema,
} from "@notra/schemas/dashboard/auth/credentials";
import {
  redeemBackupCodeInputSchema,
  verifyMfaCodeInputSchema,
} from "@notra/schemas/dashboard/auth/mfa";
import type {
  AuthFlowResult,
  RedeemBackupCodeInput,
  RedeemBackupCodeResult,
  SignInWithPasswordInput,
  VerifyEmailCodeInput,
  VerifyMfaCodeInput,
} from "@notra/ui/lib/auth-types";
import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import type { AuthenticationResponse } from "@workos-inc/node";
import { eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  ANALYTICS_AUTH_METHODS,
  PASSWORD_RESET_OUTCOMES,
} from "@/constants/analytics-events";
import { MFA_RECOVERY_COOKIE, TOTP_FACTOR_TYPE } from "@/constants/security";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import {
  clearBackupCodes,
  hasBackupCodes,
  hasUnusedBackupCode,
  replaceBackupCodes,
} from "@/lib/auth/backup-codes";
import { UserSyncError, WorkOSAuthError } from "@/lib/auth/errors";
import { resolveMfaFlow } from "@/lib/auth/mfa";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import {
  clearShortLivedCookie,
  readShortLivedCookie,
} from "@/lib/auth/short-lived-cookie";
import { syncAuthenticatedUser } from "@/lib/auth/sync";
import { readWorkOSError } from "@/lib/auth/workos-error";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignUpWithPasswordInput,
} from "@/types/auth/password-actions";
import { isRateLimited, ratelimit } from "@/utils/ratelimit";

async function trackAuthEvent(
  event: PostHogEventName,
  properties?: PostHogProperties,
  userId?: string | null
) {
  const requestHeaders = await readRequestHeaders();
  trackServerEvent({ event, headers: requestHeaders, userId, properties });
}

const VERIFICATION_REQUIRED_CODE = "email_verification_required";
const NAME_SPLIT_REGEX = /\s+/;
const DEFAULT_POST_LOGIN_PATH = "/callback";
const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";

function getClientId() {
  const clientId = process.env.WORKOS_CLIENT_ID;
  if (!clientId) {
    throw new Error("WORKOS_CLIENT_ID must be defined");
  }
  return clientId;
}

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

const tryWorkOSAuth = <T>(run: () => Promise<T>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) => new WorkOSAuthError({ error }),
  });

/** Persists the WorkOS session, syncs the local user, and resolves the redirect. */
const completeAuthentication = Effect.fn("auth.password.completeSession")(
  function* (
    response: AuthenticationResponse,
    returnTo?: string | null,
    completionEvent?: PostHogEventName
  ) {
    yield* Effect.tryPromise({
      try: () =>
        saveSession(
          {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            user: response.user,
            impersonator: response.impersonator,
            authenticationMethod: response.authenticationMethod,
          },
          getAppUrl()
        ),
      catch: (cause) =>
        new UserSyncError({ message: "Failed to persist session", cause }),
    });

    const localUser = yield* syncAuthenticatedUser({
      workosUser: response.user,
      oauthTokens: response.oauthTokens,
      authenticationMethod: response.authenticationMethod,
    });

    if (completionEvent) {
      yield* Effect.promise(() =>
        trackAuthEvent(
          completionEvent,
          { method: ANALYTICS_AUTH_METHODS.PASSWORD },
          localUser.id
        )
      );
    }

    const redirectTo =
      sanitizeReturnTo(returnTo ?? null) ?? DEFAULT_POST_LOGIN_PATH;
    return { redirectTo, localUserId: localUser.id };
  }
);

const signedIn = ({ redirectTo }: { redirectTo: string }): AuthFlowResult => ({
  status: "success",
  redirectTo,
});

const mapAuthFailure =
  (email: string) =>
  (error: WorkOSAuthError | UserSyncError | { message: string }) => {
    if (!(error instanceof WorkOSAuthError)) {
      return Effect.succeed<AuthFlowResult>({
        status: "error",
        message: error.message,
      });
    }

    const info = readWorkOSError(error.error);

    if (
      info.code === VERIFICATION_REQUIRED_CODE &&
      info.pendingAuthenticationToken
    ) {
      const pendingToken = info.pendingAuthenticationToken;
      return Effect.promise(() =>
        trackAuthEvent(POSTHOG_EVENTS.EMAIL_VERIFICATION_REQUIRED, {
          method: ANALYTICS_AUTH_METHODS.PASSWORD,
        })
      ).pipe(
        Effect.as<AuthFlowResult>({
          status: "verification-required",
          pendingAuthenticationToken: pendingToken,
          email,
        })
      );
    }

    return resolveMfaFlow(info, email).pipe(
      Effect.flatMap((mfaResult) => {
        if (!mfaResult) {
          return Effect.succeed<AuthFlowResult>({
            status: "error",
            message: info.message,
          });
        }

        const event =
          mfaResult.status === "mfa-required"
            ? POSTHOG_EVENTS.MFA_CHALLENGE_REQUIRED
            : POSTHOG_EVENTS.MFA_ENROLLMENT_REQUIRED;

        return Effect.promise(() =>
          trackAuthEvent(event, { method: ANALYTICS_AUTH_METHODS.PASSWORD })
        ).pipe(Effect.as(mfaResult));
      }),
      Effect.catch((mfaError) =>
        Effect.succeed<AuthFlowResult>({
          status: "error",
          message: readWorkOSError(mfaError.error).message,
        })
      )
    );
  };

const runAuthFlow = (
  email: string,
  flow: Effect.Effect<AuthFlowResult, WorkOSAuthError | UserSyncError>
): Promise<AuthFlowResult> =>
  Effect.runPromise(flow.pipe(Effect.catch(mapAuthFailure(email))));

export async function signInWithPasswordAction(
  rawInput: SignInWithPasswordInput
): Promise<AuthFlowResult> {
  const parsed = signInWithPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid credentials",
    };
  }

  if (await isRateLimited(ratelimit.signIn, parsed.data.email)) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  return runAuthFlow(
    parsed.data.email,
    Effect.gen(function* () {
      const response = yield* authenticateResolvingOrgSelection(() =>
        getWorkOS().userManagement.authenticateWithPassword({
          clientId: getClientId(),
          email: parsed.data.email,
          password: parsed.data.password,
        })
      );

      return signedIn(
        yield* completeAuthentication(response, parsed.data.returnTo)
      );
    })
  );
}

export async function signUpWithPasswordAction(
  rawInput: SignUpWithPasswordInput
): Promise<AuthFlowResult> {
  const parsed = signUpWithPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid details",
    };
  }

  if (await isRateLimited(ratelimit.signUp, parsed.data.email)) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const [firstName, ...rest] = (parsed.data.name ?? "")
    .trim()
    .split(NAME_SPLIT_REGEX);

  return runAuthFlow(
    parsed.data.email,
    Effect.gen(function* () {
      yield* tryWorkOSAuth(() =>
        getWorkOS().userManagement.createUser({
          email: parsed.data.email,
          password: parsed.data.password,
          firstName: firstName || undefined,
          lastName: rest.join(" ") || undefined,
        })
      );

      const response = yield* authenticateResolvingOrgSelection(() =>
        getWorkOS().userManagement.authenticateWithPassword({
          clientId: getClientId(),
          email: parsed.data.email,
          password: parsed.data.password,
        })
      );

      return signedIn(
        yield* completeAuthentication(response, parsed.data.returnTo)
      );
    })
  );
}

export async function verifyEmailCodeAction(
  rawInput: VerifyEmailCodeInput
): Promise<AuthFlowResult> {
  const parsed = verifyEmailCodeInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid code",
    };
  }

  return runAuthFlow(
    "",
    Effect.gen(function* () {
      const response = yield* authenticateResolvingOrgSelection(() =>
        getWorkOS().userManagement.authenticateWithEmailVerification({
          clientId: getClientId(),
          code: parsed.data.code,
          pendingAuthenticationToken: parsed.data.pendingAuthenticationToken,
        })
      );

      return signedIn(
        yield* completeAuthentication(
          response,
          parsed.data.returnTo,
          POSTHOG_EVENTS.EMAIL_VERIFIED
        )
      );
    })
  );
}

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

  if (
    await isRateLimited(
      ratelimit.mfaVerify,
      parsed.data.authenticationChallengeId
    )
  ) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  return runAuthFlow(
    "",
    Effect.gen(function* () {
      const response = yield* authenticateResolvingOrgSelection(() =>
        getWorkOS().userManagement.authenticateWithTotp({
          clientId: getClientId(),
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

      // The first successful TOTP sign-in is the end of enrollment: that is
      // when the user gets their one-time look at the backup codes.
      const alreadyHasCodes = yield* Effect.promise(() =>
        hasBackupCodes(session.localUserId)
      );
      if (alreadyHasCodes) {
        return signedIn(session);
      }
      const backupCodes = yield* Effect.tryPromise({
        try: () => replaceBackupCodes(session.localUserId),
        catch: (cause) =>
          new UserSyncError({
            message: "Failed to generate backup codes",
            cause,
          }),
      });
      const result: AuthFlowResult = {
        status: "enrolled",
        redirectTo: session.redirectTo,
        backupCodes,
      };
      return result;
    })
  );
}

const BACKUP_CODE_REJECTED_MESSAGE =
  "That backup code isn't valid or was already used.";

/**
 * A backup code cannot complete a WorkOS MFA challenge, so accepting one
 * removes the authenticator instead and lets the user sign in again without
 * a second factor. The code is only spent once the factors are gone, so a
 * WorkOS failure never burns it.
 */
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

  const workosUserId = await readShortLivedCookie(MFA_RECOVERY_COOKIE);
  if (!workosUserId) {
    return {
      status: "error",
      message: "This sign-in attempt expired. Please start again.",
    };
  }

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
      yield* Effect.promise(() => clearShortLivedCookie(MFA_RECOVERY_COOKIE));
      yield* Effect.promise(() =>
        trackAuthEvent(
          POSTHOG_EVENTS.MFA_BACKUP_CODE_USED,
          { method: ANALYTICS_AUTH_METHODS.PASSWORD },
          localUser.id
        )
      );
      const recovered: RedeemBackupCodeResult = {
        status: "recovered",
        email: localUser.email,
      };
      return recovered;
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

export async function forgotPasswordAction(
  rawInput: ForgotPasswordInput
): Promise<{ sent: boolean }> {
  const parsed = forgotPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    await trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_REQUESTED, {
      outcome: PASSWORD_RESET_OUTCOMES.INVALID,
    });
    return { sent: false };
  }

  const input = parsed.data;

  if (await isRateLimited(ratelimit.forgotPassword, input.email)) {
    await trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_REQUESTED, {
      outcome: PASSWORD_RESET_OUTCOMES.RATE_LIMITED,
    });
    return { sent: false };
  }

  return Effect.runPromise(
    Effect.gen(function* () {
      yield* tryWorkOSAuth(() =>
        getWorkOS().userManagement.createPasswordReset({ email: input.email })
      );

      yield* Effect.promise(() =>
        trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_REQUESTED, {
          outcome: PASSWORD_RESET_OUTCOMES.SENT,
        })
      );

      return { sent: true };
    }).pipe(
      Effect.catch((error) =>
        Effect.logWarning("Password reset request failed").pipe(
          Effect.annotateLogs({
            error: readWorkOSError(error.error).message,
          }),
          Effect.andThen(
            Effect.promise(() =>
              trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_REQUESTED, {
                outcome: PASSWORD_RESET_OUTCOMES.FAILED,
              })
            )
          ),
          Effect.as({ sent: true })
        )
      )
    )
  );
}

export async function resetPasswordAction(
  rawInput: ResetPasswordInput
): Promise<AuthFlowResult> {
  const parsed = resetPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid password reset",
    };
  }

  const input = parsed.data;

  return Effect.runPromise(
    tryWorkOSAuth(() =>
      getWorkOS().userManagement.resetPassword({
        token: input.token,
        newPassword: input.newPassword,
      })
    ).pipe(
      Effect.andThen(
        Effect.promise(() =>
          trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_COMPLETED, {
            outcome: PASSWORD_RESET_OUTCOMES.SUCCESS,
          })
        )
      ),
      Effect.as<AuthFlowResult>({ status: "success", redirectTo: "/login" }),
      Effect.catch((error) =>
        Effect.promise(() =>
          trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_COMPLETED, {
            outcome: PASSWORD_RESET_OUTCOMES.ERROR,
          })
        ).pipe(
          Effect.as<AuthFlowResult>({
            status: "error",
            message: readWorkOSError(error.error).message,
          })
        )
      )
    )
  );
}
