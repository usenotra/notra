"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { loginSchema } from "@notra/schemas/dashboard/auth/credentials";
import { LoginForm as SharedLoginForm } from "@notra/ui/components/shared/auth/login-form";
import type {
  SignInWithPasswordInput,
  VerifyEmailCodeInput,
} from "@notra/ui/lib/auth-types";

import { LOGIN_ERROR_CODES } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  signInWithPasswordAction,
  verifyEmailCodeAction,
} from "@/lib/auth/password-actions";
import { buildPostAuthRedirectPath } from "@/lib/auth/return-to";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import type { LoginFormProps } from "@/types/auth/login-form";

const validators = {
  email: (value: string) =>
    loginSchema.shape.email.safeParse(value).error?.issues[0]?.message,
  password: (value: string) =>
    loginSchema.shape.password.safeParse(value).error?.issues[0]?.message,
};

async function signInWithPasswordTracked(input: SignInWithPasswordInput) {
  const result = await signInWithPasswordAction(input);
  if (result.status === "error") {
    trackEvent(POSTHOG_EVENTS.LOGIN_FAILED, {
      error_code: LOGIN_ERROR_CODES.PASSWORD_REJECTED,
    });
  }
  return result;
}

async function verifyEmailCodeTracked(input: VerifyEmailCodeInput) {
  const result = await verifyEmailCodeAction(input);
  if (result.status === "error") {
    trackEvent(POSTHOG_EVENTS.LOGIN_FAILED, {
      error_code: LOGIN_ERROR_CODES.VERIFICATION_REJECTED,
    });
  }
  return result;
}

export function LoginForm({ returnTo, ...props }: LoginFormProps) {
  return (
    <SharedLoginForm
      {...props}
      callbackPath="/callback"
      returnTo={returnTo ? buildPostAuthRedirectPath(returnTo) : undefined}
      signInWithPassword={signInWithPasswordTracked}
      startSocialSignIn={startSocialSignInAction}
      validators={validators}
      verifyEmailCode={verifyEmailCodeTracked}
    />
  );
}
