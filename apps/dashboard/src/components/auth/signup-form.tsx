"use client";

import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { signupSchema } from "@notra/schemas/dashboard/auth/credentials";
import { AuthEmailField } from "@notra/ui/components/shared/auth/auth-email-field";
import { AuthFormError } from "@notra/ui/components/shared/auth/auth-form-error";
import { AuthFormHeader } from "@notra/ui/components/shared/auth/auth-form-header";
import { AuthOrDivider } from "@notra/ui/components/shared/auth/auth-or-divider";
import { AuthPasswordField } from "@notra/ui/components/shared/auth/auth-password-field";
import { AuthSocialButtons } from "@notra/ui/components/shared/auth/auth-social-buttons";
import { EmailVerificationForm } from "@notra/ui/components/shared/auth/email-verification-form";
import { CtaButton } from "@notra/ui/components/shared/cta-button";
import { Separator } from "@notra/ui/components/ui/separator";
import type {
  AuthMethod,
  PendingVerification,
  SocialProvider,
} from "@notra/ui/lib/auth-types";
import { setLastUsedLoginMethod } from "@notra/ui/lib/last-login-method";
import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SignupCreditsBanner } from "@/components/auth/signup-credits-banner";
import { SHOW_SIGNUP_CREDITS_BANNER } from "@/constants/signup-credits";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  signUpWithPasswordAction,
  verifyEmailCodeAction,
} from "@/lib/auth/password-actions";
import { isNextRedirectError } from "@/lib/auth/redirect-error";
import { startSocialSignInAction } from "@/lib/auth/social-actions";
import { errorMessageOr } from "@/lib/utils";
import {
  marketingAttributionSearchParams,
  persistMarketingAttribution,
  readMarketingAttributionFromValues,
} from "@/utils/marketing-attribution";
import { marketingAttributionUrlKeys } from "@/utils/marketing-attribution-keys";

const SIGNUP_ERROR_FALLBACK = "Failed to sign up. Please try again.";

export interface SignupFormProps {
  title?: string;
  description?: string;
  onSuccess?: () => void;
  returnTo?: string;
  showLoginLink?: boolean;
  showForgotPasswordLink?: boolean;
}

export function SignupForm({
  title = "Create your account",
  description = "Start turning what you ship into what you publish.",
  onSuccess,
  returnTo,
  showLoginLink = true,
  showForgotPasswordLink = false,
}: SignupFormProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);
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
    }).catch((error) => {
      if (isNextRedirectError(error)) {
        return;
      }
      authInFlightRef.current = false;
      setAuthMethod(null);
      setFormError("Social sign-up failed. Please try again.");
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
          setFormError(errorMessageOr(result.message, SIGNUP_ERROR_FALLBACK));
          authInFlightRef.current = false;
          setAuthMethod(null);
          return;
        }

        setLastUsedLoginMethod("email");
        persistMarketingAttribution({
          ...attribution,
          signupMethod: "email",
        });

        if (result.status === "verification-required") {
          authInFlightRef.current = false;
          setAuthMethod(null);
          setPendingVerification({
            pendingAuthenticationToken: result.pendingAuthenticationToken,
            email: result.email,
          });
          return;
        }

        if (onSuccess) {
          onSuccess();
        } else {
          window.location.assign(result.redirectTo);
        }
      } catch (error) {
        console.error("Email signup error:", error);
        setFormError(SIGNUP_ERROR_FALLBACK);
        authInFlightRef.current = false;
        setAuthMethod(null);
      }
    },
  });

  if (pendingVerification) {
    return (
      <EmailVerificationForm
        email={pendingVerification.email}
        onSuccess={onSuccess}
        pendingAuthenticationToken={
          pendingVerification.pendingAuthenticationToken
        }
        returnTo={buildCallbackUrl("email")}
        verifyEmailCode={verifyEmailCodeAction}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader description={description} title={title} />

      {SHOW_SIGNUP_CREDITS_BANNER && <SignupCreditsBanner />}

      <div className="grid gap-4">
        <AuthSocialButtons
          authMethod={authMethod}
          disabled={isAuthLoading}
          onSelect={handleSocialSignup}
        />

        <AuthOrDivider />

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
                  signupSchema.shape.email.safeParse(value).error?.issues[0]
                    ?.message,
                onSubmit: ({ value }) =>
                  signupSchema.shape.email.safeParse(value).error?.issues[0]
                    ?.message,
              }}
            >
              {(field) => (
                <AuthEmailField
                  disabled={isAuthLoading}
                  error={field.state.meta.errors[0]}
                  id={field.name}
                  label="Email"
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  placeholder="jane@company.com"
                  value={field.state.value}
                />
              )}
            </form.Field>
            <form.Field
              name="password"
              validators={{
                onBlur: ({ value }) =>
                  signupSchema.shape.password.safeParse(value).error?.issues[0]
                    ?.message,
                onSubmit: ({ value }) =>
                  signupSchema.shape.password.safeParse(value).error?.issues[0]
                    ?.message,
              }}
            >
              {(field) => (
                <AuthPasswordField
                  autoComplete="new-password"
                  disabled={isAuthLoading}
                  error={field.state.meta.errors[0]}
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  placeholder="At least 10 characters"
                  value={field.state.value}
                />
              )}
            </form.Field>
          </div>

          <AuthFormError className="mt-4" error={formError} />

          <CtaButton
            className="mt-4 w-full"
            disabled={isAuthLoading}
            type="submit"
          >
            {authMethod === "email" ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </CtaButton>
        </form>
      </div>

      {(showForgotPasswordLink || showLoginLink) && (
        <div className="text-muted-foreground flex flex-col gap-4 px-8 text-center text-xs">
          {showForgotPasswordLink && (
            <p>
              Forgot your password?{" "}
              <Link
                className="hover:text-primary underline underline-offset-4"
                href="/forgot-password"
              >
                Reset Your Password
              </Link>
            </p>
          )}
          {showForgotPasswordLink && showLoginLink && <Separator />}
          {showLoginLink && (
            <p>
              Already have an account?{" "}
              <Link
                className="hover:text-primary underline underline-offset-4"
                href="/login"
              >
                Log in
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
