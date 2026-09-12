"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useAuthFlow } from "../../../hooks/use-auth-flow";
import type {
  AuthMethod,
  LoginFormProps,
  SocialProvider,
} from "../../../lib/auth-types";
import {
  getLastUsedLoginMethod,
  setLastUsedLoginMethod,
} from "../../../lib/last-login-method";
import { isNextRedirectError } from "../../../lib/redirect-error";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import { CtaButton } from "../cta-button";
import { AuthEmailField } from "./auth-email-field";
import { AuthFormError } from "./auth-form-error";
import { AuthFormHeader } from "./auth-form-header";
import { AuthOrDivider } from "./auth-or-divider";
import { AuthPasskeyButton } from "./auth-passkey-button";
import { AuthPasswordField } from "./auth-password-field";
import { AuthPendingStep } from "./auth-pending-step";
import { AuthSocialButtons } from "./auth-social-buttons";

const LOGIN_ERROR_FALLBACK = "Failed to sign in. Please try again.";
const PASSKEY_ERROR_FALLBACK = "Passkey sign-in failed. Please try again.";
const SOCIAL_ERROR_FALLBACK = "Social sign-in failed. Please try again.";

const noop = () => {
  return;
};
const subscribeToNothing = () => noop;
const returnNull = () => null;

/**
 * Leaving an untouched field (for example by clicking a social or passkey
 * button) should not flag it as missing; "required" surfaces on submit.
 */
const validateFilledField = (
  validate: (value: string) => string | undefined,
  value: string
) => (value.length > 0 ? validate(value) : undefined);

export function LoginForm({
  title = "Welcome back",
  description = "Log in to pick up where your team left off.",
  onSuccess,
  returnTo,
  showSignupLink = true,
  showForgotPasswordLink = true,
  initialError,
  initialPending,
  callbackPath,
  validators,
  signInWithPassword,
  verifyEmailCode,
  verifyMfaCode,
  redeemBackupCode,
  startSocialSignIn,
  startPasskeySignIn,
}: LoginFormProps) {
  const [authMethod, setAuthMethod] = useState<AuthMethod | null>(null);
  const [formError, setFormError] = useState<string | null>(
    initialError ?? null
  );
  const authInFlightRef = useRef(false);
  const flow = useAuthFlow({ initialPending, onSuccess });
  const lastMethod = useSyncExternalStore(
    subscribeToNothing,
    getLastUsedLoginMethod,
    returnNull
  );
  const isAuthLoading = authMethod !== null;
  const callbackURL = returnTo ?? callbackPath;

  function releaseAuth() {
    authInFlightRef.current = false;
    setAuthMethod(null);
  }

  /** Runs a redirect-style sign-in (social, passkey); a Next redirect throws by design. */
  function startRedirectSignIn(
    method: AuthMethod,
    start: () => Promise<void>,
    fallbackError: string
  ) {
    if (authInFlightRef.current) {
      return;
    }
    setFormError(null);
    authInFlightRef.current = true;
    setAuthMethod(method);
    setLastUsedLoginMethod(method);
    start().catch((error) => {
      if (isNextRedirectError(error)) {
        return;
      }
      releaseAuth();
      setFormError(fallbackError);
    });
  }

  async function submitPassword(email: string, password: string) {
    if (authInFlightRef.current) {
      return;
    }
    setFormError(null);
    authInFlightRef.current = true;
    setAuthMethod("email");
    try {
      const result = await signInWithPassword({
        email,
        password,
        returnTo: callbackURL,
      });
      if (result.status === "success") {
        setLastUsedLoginMethod("email");
      }
      if (!flow.applyResult(result)) {
        setFormError(
          result.status === "error"
            ? result.message || LOGIN_ERROR_FALLBACK
            : LOGIN_ERROR_FALLBACK
        );
      }
      if (result.status !== "success") {
        releaseAuth();
      }
    } catch (error) {
      console.error("Email login error:", error);
      setFormError(LOGIN_ERROR_FALLBACK);
      releaseAuth();
    }
  }

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      if (validators.email(value.email) || validators.password(value.password)) {
        return;
      }
      await submitPassword(value.email, value.password);
    },
  });

  function resetToSignIn() {
    flow.reset();
    setFormError(null);
  }

  /**
   * A backup code removed the authenticator. If the password is still in the
   * form, sign in again right away; otherwise ask the user to sign in.
   */
  async function handleRecovered(recoveredEmail: string) {
    flow.reset();
    const { email, password } = form.state.values;
    if (email && password) {
      await submitPassword(email, password);
      return;
    }
    setFormError(
      `Backup code accepted. Two-factor authentication was turned off for ${recoveredEmail}. Sign in again to continue.`
    );
  }

  if (flow.pending) {
    return (
      <AuthPendingStep
        onBack={resetToSignIn}
        onFinish={flow.finish}
        onRecovered={handleRecovered}
        onResult={flow.applyResult}
        redeemBackupCode={redeemBackupCode}
        returnTo={callbackURL}
        step={flow.pending}
        verifyEmailCode={verifyEmailCode}
        verifyMfaCode={verifyMfaCode}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader description={description} title={title} />

      <div className="grid gap-4">
        <AuthSocialButtons
          authMethod={authMethod}
          disabled={isAuthLoading}
          lastMethod={lastMethod}
          onSelect={(provider: SocialProvider) =>
            startRedirectSignIn(
              provider,
              () => startSocialSignIn({ provider, returnTo: callbackURL }),
              SOCIAL_ERROR_FALLBACK
            )
          }
        />

        {startPasskeySignIn && (
          <AuthPasskeyButton
            disabled={isAuthLoading}
            lastUsed={lastMethod === "passkey"}
            loading={authMethod === "passkey"}
            onClick={() =>
              startRedirectSignIn(
                "passkey",
                () => startPasskeySignIn({ returnTo: callbackURL }),
                PASSKEY_ERROR_FALLBACK
              )
            }
          />
        )}

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
                  validateFilledField(validators.email, value),
                onSubmit: ({ value }) => validators.email(value),
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
                  validateFilledField(validators.password, value),
                onSubmit: ({ value }) => validators.password(value),
              }}
            >
              {(field) => (
                <AuthPasswordField
                  autoComplete="current-password"
                  disabled={isAuthLoading}
                  error={field.state.meta.errors[0]}
                  id={field.name}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  placeholder="Your password"
                  value={field.state.value}
                />
              )}
            </form.Field>
          </div>

          <AuthFormError className="mt-4" error={formError} />

          <div className="relative mt-4 pt-2">
            {lastMethod === "email" && (
              <Badge
                className="-right-2 absolute top-0 z-10"
                variant="default"
              >
                Last Used
              </Badge>
            )}
            <CtaButton
              className="w-full"
              disabled={isAuthLoading}
              type="submit"
            >
              {authMethod === "email" ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Log in"
              )}
            </CtaButton>
          </div>
        </form>
      </div>

      {(showForgotPasswordLink || showSignupLink) && (
        <div className="flex flex-col gap-4 px-8 text-center text-muted-foreground text-xs">
          {showForgotPasswordLink && (
            <p>
              Forgot your password?{" "}
              <Link
                className="underline underline-offset-4 hover:text-primary"
                href="/forgot-password"
              >
                Reset Your Password
              </Link>
            </p>
          )}
          {showForgotPasswordLink && showSignupLink && <Separator />}
          {showSignupLink && (
            <p>
              Don&apos;t have an account?{" "}
              <Link
                className="underline underline-offset-4 hover:text-primary"
                href="/signup"
              >
                Register
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
