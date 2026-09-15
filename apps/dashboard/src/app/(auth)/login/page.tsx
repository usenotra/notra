import type { PendingAuthStep } from "@notra/schemas/types/dashboard/auth";

import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import {
  LOGIN_ERROR_KEYS,
  LOGIN_MFA_QUERY_KEY,
  LOGIN_MFA_QUERY_VALUE,
} from "@/constants/security";
import { readPendingMfaChallenge } from "@/lib/auth/mfa-cookies";
import type { LoginPageProps } from "@/types/auth/login-page";

const ERROR_MESSAGES: Record<string, string> = {
  "social-sign-in-failed": "Social sign-in failed. Please try again.",
  "external-login-failed":
    "Authorization could not be completed. Please try again.",
  [LOGIN_ERROR_KEYS.MFA_ENROLLMENT_REQUIRED]:
    "Your organization requires two-factor authentication. Sign in with your email and password to set it up.",
};

async function resolveInitialPending(
  mfa: string | undefined,
  verify: string | undefined,
  email: string | undefined
): Promise<PendingAuthStep | undefined> {
  if (mfa === LOGIN_MFA_QUERY_VALUE) {
    const challenge = await readPendingMfaChallenge();
    if (challenge) {
      return { status: "mfa-required", ...challenge };
    }
  }
  if (verify) {
    return {
      status: "verification-required",
      pendingAuthenticationToken: verify,
      email: email ?? "",
    };
  }
  return undefined;
}

export default async function Login({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;

  const readParam = (key: string) => {
    const value = resolvedSearchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  const returnTo = readParam("returnTo");
  const verify = readParam("verify");
  const email = readParam("email");
  const errorKey = readParam("error");
  const mfa = readParam(LOGIN_MFA_QUERY_KEY);
  const knownErrorKey =
    errorKey && errorKey in ERROR_MESSAGES ? errorKey : undefined;
  const initialPending = await resolveInitialPending(mfa, verify, email);

  return (
    <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
      {knownErrorKey ? <LoginErrorTracker errorCode={knownErrorKey} /> : null}
      <LoginForm
        initialError={errorKey ? ERROR_MESSAGES[errorKey] : undefined}
        initialPending={initialPending}
        returnTo={returnTo}
      />
    </div>
  );
}
