"use server";

import { POSTHOG_EVENTS, type PostHogEventName } from "@notra/posthog/events";
import type { PostHogProperties } from "@notra/posthog/types/posthog";
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInWithPasswordInputSchema,
  signUpWithPasswordInputSchema,
  verifyEmailCodeInputSchema,
} from "@notra/schemas/dashboard/auth/credentials";
import type {
  AuthFlowResult,
  SignInWithPasswordInput,
  VerifyEmailCodeInput,
} from "@notra/ui/lib/auth-types";
import type { Ratelimit } from "@upstash/ratelimit";
import { getWorkOS, saveSession } from "@workos-inc/authkit-nextjs";
import type { AuthenticationResponse } from "@workos-inc/node";
import { Effect } from "effect";
import { headers } from "next/headers";

import {
  ANALYTICS_AUTH_METHODS,
  PASSWORD_RESET_OUTCOMES,
} from "@/constants/analytics-events";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import { readRequestHeaders } from "@/lib/analytics/request-headers";
import { UserSyncError, WorkOSAuthError } from "@/lib/auth/errors";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { sanitizeReturnTo } from "@/lib/auth/return-to";
import { syncAuthenticatedUser } from "@/lib/auth/sync";
import { readWorkOSError } from "@/lib/auth/workos-error";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignUpWithPasswordInput,
} from "@/types/auth/password-actions";
import { getClientIpFromHeaders, ratelimit } from "@/utils/ratelimit";

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

async function isRateLimited(limiter: Ratelimit, email: string) {
  if (
    process.env.NODE_ENV !== "production" &&
    (!process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN)
  ) {
    return false;
  }

  const headersList = await headers();
  const ip = getClientIpFromHeaders(headersList);
  const { success } = await limiter.limit(`${ip}:${email.toLowerCase()}`);
  return !success;
}

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

    const result: AuthFlowResult = { status: "success", redirectTo };
    return result;
  }
);

const mapAuthFailure =
  (email: string) =>
  (error: WorkOSAuthError | UserSyncError | { message: string }) => {
    if (error instanceof WorkOSAuthError) {
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

      return Effect.succeed<AuthFlowResult>({
        status: "error",
        message: info.message,
      });
    }

    return Effect.succeed<AuthFlowResult>({
      status: "error",
      message: error.message,
    });
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

      return yield* completeAuthentication(response, parsed.data.returnTo);
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

      return yield* completeAuthentication(response, parsed.data.returnTo);
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

      return yield* completeAuthentication(
        response,
        parsed.data.returnTo,
        POSTHOG_EVENTS.EMAIL_VERIFIED
      );
    })
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
