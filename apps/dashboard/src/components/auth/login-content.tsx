"use client";

import { parseAsString, useQueryState } from "nuqs";

import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import { LOGIN_ERROR_MESSAGES } from "@/constants/login-error-messages";

export function LoginContent() {
  const [returnTo] = useQueryState("returnTo", parseAsString);
  const [verify] = useQueryState("verify", parseAsString);
  const [email] = useQueryState("email", parseAsString);
  const [errorKey] = useQueryState("error", parseAsString);
  const knownErrorKey =
    errorKey && errorKey in LOGIN_ERROR_MESSAGES ? errorKey : undefined;

  return (
    <>
      {knownErrorKey ? <LoginErrorTracker errorCode={knownErrorKey} /> : null}
      <LoginForm
        initialError={errorKey ? LOGIN_ERROR_MESSAGES[errorKey] : undefined}
        initialPendingVerification={
          verify
            ? { pendingAuthenticationToken: verify, email: email ?? "" }
            : undefined
        }
        returnTo={returnTo ?? undefined}
      />
    </>
  );
}
