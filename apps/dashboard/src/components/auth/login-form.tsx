"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { loginSchema } from "@notra/schemas/dashboard/auth/credentials";
import { LoginForm as SharedLoginForm } from "@notra/ui/components/shared/auth/login-form";
import type {
  SignInWithPasswordInput,
  RedeemBackupCodeInput,
  VerifyEmailCodeInput,
  VerifyMfaCodeInput,
} from "@notra/ui/lib/auth-types";

import { LOGIN_ERROR_CODES } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { startPasskeySignInAction } from "@/lib/auth/passkey-actions";
import {
  signInWithPasswordAction,
  redeemBackupCodeAction,
  verifyEmailCodeAction,
  verifyMfaCodeAction,
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

async function verifyMfaCodeTracked(input: VerifyMfaCodeInput) {
  const result = await verifyMfaCodeAction(input);
  if (result.status === "error") {
    trackEvent(POSTHOG_EVENTS.LOGIN_FAILED, {
      error_code: LOGIN_ERROR_CODES.MFA_REJECTED,
    });
  }
  return result;
}

async function redeemBackupCodeTracked(input: RedeemBackupCodeInput) {
  const result = await redeemBackupCodeAction(input);
  if (result.status === "error") {
    trackEvent(POSTHOG_EVENTS.LOGIN_FAILED, {
      error_code: LOGIN_ERROR_CODES.BACKUP_CODE_REJECTED,
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
      startPasskeySignIn={startPasskeySignInAction}
      startSocialSignIn={startSocialSignInAction}
      redeemBackupCode={redeemBackupCodeTracked}
      validators={validators}
      verifyEmailCode={verifyEmailCodeTracked}
      verifyMfaCode={verifyMfaCodeTracked}
    />
  );
}
