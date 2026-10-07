import { createServerFn } from "@tanstack/react-start";

const signInWithPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof signInWithPasswordActionImpl>) => data)
  .handler(({ data }) => signInWithPasswordActionImpl(...data));
export const signInWithPasswordAction = (
  ...data: Parameters<typeof signInWithPasswordActionImpl>
) => signInWithPasswordServerFn({ data });

const signUpWithPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof signUpWithPasswordActionImpl>) => data)
  .handler(({ data }) => signUpWithPasswordActionImpl(...data));
export const signUpWithPasswordAction = (
  ...data: Parameters<typeof signUpWithPasswordActionImpl>
) => signUpWithPasswordServerFn({ data });

const verifyEmailCodeServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof verifyEmailCodeActionImpl>) => data)
  .handler(({ data }) => verifyEmailCodeActionImpl(...data));
export const verifyEmailCodeAction = (
  ...data: Parameters<typeof verifyEmailCodeActionImpl>
) => verifyEmailCodeServerFn({ data });

const forgotPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof forgotPasswordActionImpl>) => data)
  .handler(({ data }) => forgotPasswordActionImpl(...data));
export const forgotPasswordAction = (
  ...data: Parameters<typeof forgotPasswordActionImpl>
) => forgotPasswordServerFn({ data });

const resetPasswordServerFn = createServerFn({ method: "POST" })
  .validator((data: Parameters<typeof resetPasswordActionImpl>) => data)
  .handler(({ data }) => resetPasswordActionImpl(...data));
export const resetPasswordAction = (
  ...data: Parameters<typeof resetPasswordActionImpl>
) => resetPasswordServerFn({ data });

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
import { getWorkOS } from "@workos/authkit-session";
import { Effect } from "effect";

import { PASSWORD_RESET_OUTCOMES } from "@/constants/analytics-events";
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
import { authenticateResolvingOrgSelection } from "@/lib/auth/org-selection";
import { readWorkOSError } from "@/lib/auth/workos-error";
import { isRateLimited, ratelimit } from "@/utils/ratelimit";

const NAME_SPLIT_REGEX = /\s+/;

async function signInWithPasswordActionImpl(
  rawInput: SignInWithPasswordInput
): Promise<AuthFlowResult> {
  const parsed = signInWithPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("invalidInput"),
    };
  }

  if (await isRateLimited(ratelimit.signIn, parsed.data.email)) {
    return { status: "error", message: await authActionMessage("rateLimited") };
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

async function signUpWithPasswordActionImpl(
  rawInput: SignUpWithPasswordInput
): Promise<AuthFlowResult> {
  const parsed = signUpWithPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("invalidInput"),
    };
  }

  if (await isRateLimited(ratelimit.signUp, parsed.data.email)) {
    return { status: "error", message: await authActionMessage("rateLimited") };
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

async function verifyEmailCodeActionImpl(
  rawInput: VerifyEmailCodeInput
): Promise<AuthFlowResult> {
  const parsed = verifyEmailCodeInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("invalidCode"),
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

async function forgotPasswordActionImpl(
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

async function resetPasswordActionImpl(
  rawInput: ResetPasswordInput
): Promise<AuthFlowResult> {
  const parsed = resetPasswordInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: await authActionMessage("invalidInput"),
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
          Effect.andThen(
            Effect.promise(() =>
              workOSFailureMessage(readWorkOSError(error.error))
            )
          ),
          Effect.map((message): AuthFlowResult => ({
            status: "error",
            message,
          }))
        )
      )
    )
  );
}
