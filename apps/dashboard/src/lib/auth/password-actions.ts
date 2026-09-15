"use server";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  signInWithPasswordInputSchema,
  signUpWithPasswordInputSchema,
  verifyEmailCodeInputSchema,
} from "@notra/schemas/dashboard/auth/credentials";
import type {
  AuthFlowResult,
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInWithPasswordInput,
  SignUpWithPasswordInput,
  VerifyEmailCodeInput,
} from "@notra/schemas/types/dashboard/auth";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";

import { PASSWORD_RESET_OUTCOMES } from "@/constants/analytics-events";
import {
  completeAuthentication,
  getWorkOSClientId,
  runAuthFlow,
  signedIn,
  trackAuthEvent,
  tryWorkOSAuth,
} from "@/lib/auth/auth-flow";
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { isRateLimited, ratelimit } from "@/utils/ratelimit";

const NAME_SPLIT_REGEX = /\s+/;
const RATE_LIMITED_MESSAGE = "Too many attempts. Please try again shortly.";

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
          clientId: getWorkOSClientId(),
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
          clientId: getWorkOSClientId(),
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
          clientId: getWorkOSClientId(),
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
    tryWorkOSAuth(() =>
      getWorkOS().userManagement.createPasswordReset({ email: input.email })
    ).pipe(
      Effect.andThen(
        Effect.promise(() =>
          trackAuthEvent(POSTHOG_EVENTS.PASSWORD_RESET_REQUESTED, {
            outcome: PASSWORD_RESET_OUTCOMES.SENT,
          })
        )
      ),
      Effect.as({ sent: true }),
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
