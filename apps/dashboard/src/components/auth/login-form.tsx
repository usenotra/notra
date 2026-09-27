"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import type {
  RedeemBackupCodeInput,
  SignInWithPasswordInput,
  VerifyEmailCodeInput,
  VerifyMfaCodeInput,
} from "@notra/schemas/types/dashboard/auth";
import { LoginForm as SharedLoginForm } from "@notra/ui/components/shared/auth/login-form";
import { useTranslations } from "next-intl";
import * as z from "zod";

import { LOGIN_ERROR_CODES } from "@/constants/analytics-events";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  redeemBackupCodeAction,
  verifyMfaCodeAction,
} from "@/lib/auth/mfa-actions";
import {
  signInWithPasswordAction,
  verifyEmailCodeAction,
} from "@/lib/auth/password-actions";
import { buildPostAuthRedirectPath } from "@/lib/auth/return-to";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import { useLoginFormLabels } from "@/lib/i18n/use-auth-labels";
import type { LoginFormProps } from "@/types/auth/login-form";

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
  const t = useTranslations("auth.validation");
  const labels = useLoginFormLabels();
  const emailSchema = z
    .string()
    .min(1, t("emailRequired"))
    .email(t("emailInvalid"));
  const passwordSchema = z
    .string()
    .min(1, t("passwordRequired"))
    .max(128, t("passwordMax"));
  const validators = {
    email: (value: string) =>
      emailSchema.safeParse(value).error?.issues[0]?.message,
    password: (value: string) =>
      passwordSchema.safeParse(value).error?.issues[0]?.message,
  };

  return (
    <SharedLoginForm
      {...props}
      callbackPath="/callback"
      labels={labels}
      returnTo={returnTo ? buildPostAuthRedirectPath(returnTo) : undefined}
      signInWithPassword={signInWithPasswordTracked}
      startSocialSignIn={startSocialSignInAction}
      redeemBackupCode={redeemBackupCodeTracked}
      validators={validators}
      verifyEmailCode={verifyEmailCodeTracked}
      verifyMfaCode={verifyMfaCodeTracked}
    />
  );
}
