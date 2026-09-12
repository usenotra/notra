import type { PendingAuthStep } from "@notra/ui/lib/auth-types";

import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import { LOGIN_ERROR_KEYS, LOGIN_MFA_QUERY_KEYS } from "@/constants/security";

const ERROR_MESSAGES: Record<string, string> = {
  "social-sign-in-failed": "Social sign-in failed. Please try again.",
  "external-login-failed":
    "Authorization could not be completed. Please try again.",
  [LOGIN_ERROR_KEYS.MFA_ENROLLMENT_REQUIRED]:
    "Your organization requires two-factor authentication. Sign in with your email and password to set it up.",
};

function resolveInitialPending({
  verify,
  mfaToken,
  mfaChallengeId,
  email,
}: {
  verify?: string;
  mfaToken?: string;
  mfaChallengeId?: string;
  email?: string;
}): PendingAuthStep | undefined {
  if (mfaToken && mfaChallengeId) {
    return {
      status: "mfa-required",
      pendingAuthenticationToken: mfaToken,
      authenticationChallengeId: mfaChallengeId,
      email: email ?? "",
    };
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

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  const readParam = (key: string) => {
    const value = resolvedSearchParams[key];
    return typeof value === "string" ? value : undefined;
  };

  const returnTo = readParam("returnTo");
  const verify = readParam("verify");
  const email = readParam("email");
  const errorKey = readParam("error");
  const mfaToken = readParam(LOGIN_MFA_QUERY_KEYS.token);
  const mfaChallengeId = readParam(LOGIN_MFA_QUERY_KEYS.challenge);
  const knownErrorKey =
    errorKey && errorKey in ERROR_MESSAGES ? errorKey : undefined;

  return (
    <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
      {knownErrorKey ? <LoginErrorTracker errorCode={knownErrorKey} /> : null}
      <LoginForm
        initialError={errorKey ? ERROR_MESSAGES[errorKey] : undefined}
        initialPending={resolveInitialPending({
          verify,
          mfaToken,
          mfaChallengeId,
          email,
        })}
        returnTo={returnTo}
      />
    </div>
  );
}
