"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { AuthEmailField } from "@notra/ui/components/shared/auth/auth-email-field";
import { AuthFormError } from "@notra/ui/components/shared/auth/auth-form-error";
import { AuthFormHeader } from "@notra/ui/components/shared/auth/auth-form-header";
import { AuthOrDivider } from "@notra/ui/components/shared/auth/auth-or-divider";
import { AuthPasswordField } from "@notra/ui/components/shared/auth/auth-password-field";
import { AuthPendingStep } from "@notra/ui/components/shared/auth/auth-pending-step";
import { AuthSocialButtons } from "@notra/ui/components/shared/auth/auth-social-buttons";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Separator } from "@notra/ui/components/ui/separator";
import { useAuthFlow } from "@notra/ui/hooks/use-auth-flow";
import { setLastUsedLoginMethod } from "@notra/ui/lib/last-login-method";
import type { AuthMethod, SocialProvider } from "@notra/ui/types/auth";
import { useForm } from "@tanstack/react-form";
import { useQueryStates } from "nuqs";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "use-intl";
import * as z from "zod";

import Link from "@/components/framework/link";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  redeemBackupCodeAction,
  verifyMfaCodeAction,
} from "@/lib/auth/mfa-actions";
import {
  signUpWithPasswordAction,
  verifyEmailCodeAction,
} from "@/lib/auth/password-actions";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import { useAuthPendingStepLabels } from "@/lib/i18n/use-auth-labels";
import { errorMessageOr } from "@/lib/utils";
import {
  marketingAttributionSearchParams,
  persistMarketingAttribution,
  readMarketingAttributionFromValues,
} from "@/utils/marketing-attribution";
import { marketingAttributionUrlKeys } from "@/utils/marketing-attribution-keys";

export interface SignupFormProps {
  title?: string;
  description?: string;
  onSuccess?: () => void;
  returnTo?: string;
  showLoginLink?: boolean;
  showForgotPasswordLink?: boolean;
}

export function SignupForm({
  title,
  description,
  onSuccess,
  returnTo,
  showLoginLink = true,
  showForgotPasswordLink = false,
}: SignupFormProps) {
  const t = useTranslations("auth.signup");
  const tCommon = useTranslations("common");
  const tValidation = useTranslations("auth.validation");
  const tLogin = useTranslations("auth.loginForm");
  const pendingStepLabels = useAuthPendingStepLabels();
  const signupErrorFallback = t("failed");
  const emailSchema = z
    .string()
    .min(1, tValidation("emailRequired"))
    .email(tValidation("emailInvalid"));
  const passwordSchema = z
    .string()
    .min(1, tValidation("passwordRequired"))
    .min(10, tValidation("passwordMinSignup"))
    .max(128, tValidation("passwordMax"));
  const signupSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
  });
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const flow = useAuthFlow({ onSuccess });
  const authInFlightRef = useRef(false);
  const [attributionParams] = useQueryStates(marketingAttributionSearchParams, {
    history: "replace",
    urlKeys: marketingAttributionUrlKeys,
  });
  const isAuthLoading = authMethod !== null;

  const attribution = readMarketingAttributionFromValues({
    landingPageH1Copy: attributionParams.dbLandingPageH1Copy,
    landingPageH1Variant: attributionParams.dbLandingPageH1Variant,
    source: attributionParams.dbSource,
    signupMethod: attributionParams.signupMethod,
  });

  function buildCallbackUrl(signupMethod: "email" | SocialProvider) {
    const params = new URLSearchParams();

    if (returnTo) {
      params.set("returnTo", encodeURIComponent(returnTo));
    }

    if (attribution.source) {
      params.set("db_source", attribution.source);
    }
    if (attribution.landingPageH1Variant) {
      params.set(
        "db_landing_page_h1_variant",
        attribution.landingPageH1Variant
      );
    }
    if (attribution.landingPageH1Copy) {
      params.set("db_landing_page_h1_copy", attribution.landingPageH1Copy);
    }

    params.set("signup_method", signupMethod);

    const query = params.toString();

    return query ? `/callback?${query}` : "/callback";
  }

  function handleSocialSignup(provider: SocialProvider) {
    if (authInFlightRef.current) {
      return;
    }

    setFormError(null);
    authInFlightRef.current = true;
    flushSync(() => setAuthMethod(provider));
    persistMarketingAttribution({ ...attribution, signupMethod: provider });
    trackEvent(POSTHOG_EVENTS.SIGNUP_STARTED, {
      method: provider,
      db_source: attribution.source ?? null,
      landing_page_h1_variant: attribution.landingPageH1Variant ?? null,
    });
    setLastUsedLoginMethod(provider);
    startSocialSignInAction({
      provider,
      returnTo: buildCallbackUrl(provider),
    }).catch(() => {
      authInFlightRef.current = false;
      setAuthMethod(null);
      setFormError(t("socialFailed"));
    });
  }

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      if (authInFlightRef.current) {
        return;
      }

      const parsed = signupSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }

      setFormError(null);
      authInFlightRef.current = true;
      flushSync(() => setAuthMethod("email"));
      trackEvent(POSTHOG_EVENTS.SIGNUP_STARTED, {
        method: "password",
        db_source: attribution.source ?? null,
        landing_page_h1_variant: attribution.landingPageH1Variant ?? null,
      });
      const fallbackName = parsed.data.email.split("@")[0] || "User";
      try {
        const result = await signUpWithPasswordAction({
          email: parsed.data.email,
          password: parsed.data.password,
          name: fallbackName,
          returnTo: buildCallbackUrl("email"),
        });

        if (result.status === "error") {
          setFormError(errorMessageOr(result.message, signupErrorFallback));
          authInFlightRef.current = false;
          setAuthMethod(null);
          return;
        }

        setLastUsedLoginMethod("email");
        persistMarketingAttribution({
          ...attribution,
          signupMethod: "email",
        });

        flow.applyResult(result);
        if (result.status !== "success") {
          authInFlightRef.current = false;
          setAuthMethod(null);
        }
      } catch (error) {
        console.error("Email signup error:", error);
        setFormError(signupErrorFallback);
        authInFlightRef.current = false;
        setAuthMethod(null);
      }
    },
  });

  if (flow.pending) {
    return (
      <AuthPendingStep
        labels={pendingStepLabels}
        onBack={flow.reset}
        onFinish={flow.finish}
        onRecovered={(email) => {
          flow.reset();
          setFormError(t("backupCodeAccepted", { email }));
        }}
        onResult={flow.applyResult}
        redeemBackupCode={redeemBackupCodeAction}
        returnTo={buildCallbackUrl("email")}
        step={flow.pending}
        verifyEmailCode={verifyEmailCodeAction}
        verifyMfaCode={verifyMfaCodeAction}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description ?? t("description")}
        title={title ?? t("title")}
      />

      <div className="grid gap-4">
        <AuthSocialButtons
          authMethod={authMethod}
          disabled={isAuthLoading}
          lastUsedLabel={tLogin("lastUsed")}
          onSelect={handleSocialSignup}
        />

        <AuthOrDivider label={t("or")} />

        <form
          aria-busy={isAuthLoading}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setFormError(null);
            form.handleSubmit();
          }}
        >
          <div className="grid gap-3">
            <form.Field
              name="email"
              validators={{
                onBlur: ({ value }) =>
                  value.length > 0
                    ? emailSchema.safeParse(value).error?.issues[0]?.message
                    : undefined,
                onSubmit: ({ value }) =>
                  emailSchema.safeParse(value).error?.issues[0]?.message,
              }}
            >
              {(field) => (
                <AuthEmailField
                  disabled={isAuthLoading}
                  error={field.state.meta.errors[0]}
                  id={field.name}
                  label={tCommon("labels.email")}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  placeholder={t("emailPlaceholder")}
                  value={field.state.value}
                />
              )}
            </form.Field>
            <form.Field
              name="password"
              validators={{
                onBlur: ({ value }) =>
                  value.length > 0
                    ? passwordSchema.safeParse(value).error?.issues[0]?.message
                    : undefined,
                onSubmit: ({ value }) =>
                  passwordSchema.safeParse(value).error?.issues[0]?.message,
              }}
            >
              {(field) => (
                <AuthPasswordField
                  autoComplete="new-password"
                  disabled={isAuthLoading}
                  error={field.state.meta.errors[0]}
                  id={field.name}
                  onBlur={field.handleBlur}
                  label={tCommon("labels.password")}
                  onChange={field.handleChange}
                  placeholder={t("passwordPlaceholder")}
                  value={field.state.value}
                />
              )}
            </form.Field>
          </div>

          <AuthFormError className="mt-4" error={formError} />

          <CtaButton
            className="mt-4 w-full"
            disabled={isAuthLoading}
            loading={authMethod === "email"}
            type="submit"
          >
            {t("submit")}
          </CtaButton>
        </form>
      </div>

      {(showForgotPasswordLink || showLoginLink) && (
        <div className="text-muted-foreground flex flex-col gap-4 px-8 text-center text-xs">
          {showForgotPasswordLink && (
            <p>
              {t.rich("forgotPassword", {
                link: (chunks) => (
                  <Link
                    className="hover:text-primary underline underline-offset-4"
                    href="/forgot-password"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
          {showForgotPasswordLink && showLoginLink && <Separator />}
          {showLoginLink && (
            <p>
              {t.rich("haveAccount", {
                link: (chunks) => (
                  <Link
                    className="hover:text-primary underline underline-offset-4"
                    href="/login"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
