import type { PendingAuthStep } from "@notra/schemas/types/dashboard/auth";

import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";
import { SocialEnrollmentResume } from "@/components/auth/social-enrollment-resume";
import { LOGIN_ERROR_MESSAGES } from "@/constants/login-error-messages";
import { LOGIN_MFA_QUERY_KEY } from "@/constants/security";
import { readPendingMfaFlow } from "@/lib/auth/mfa-cookies";
import type { LoginPageProps, LoginPageStart } from "@/types/auth/login-page";

/** Which screen the page opens on, from the social handoff or the URL. */
async function resolveStart(
  mfa: string | undefined,
  verify: string | undefined,
  email: string | undefined
): Promise<LoginPageStart> {
  if (mfa) {
    const flow = await readPendingMfaFlow(mfa);
    if (flow?.kind === "challenge") {
      const { kind: _kind, ...challenge } = flow;
      return { pending: { status: "mfa-required", ...challenge } };
    }
    if (flow?.kind === "enrollment") {
      return { resumeEnrollmentFlowId: mfa };
    }
  }
  if (verify) {
    const pending: PendingAuthStep = {
      status: "verification-required",
      pendingAuthenticationToken: verify,
      email: email ?? "",
    };
    return { pending };
  }
  return {};
}

export async function LoginContent({ searchParams }: LoginPageProps) {
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
    errorKey && Object.hasOwn(LOGIN_ERROR_MESSAGES, errorKey)
      ? errorKey
      : undefined;
  const start = await resolveStart(mfa, verify, email);

  return (
    <>
      {knownErrorKey ? <LoginErrorTracker errorCode={knownErrorKey} /> : null}
      {start.resumeEnrollmentFlowId ? (
        <SocialEnrollmentResume
          flowId={start.resumeEnrollmentFlowId}
          returnTo={returnTo}
        />
      ) : (
        <LoginForm
          initialError={
            knownErrorKey ? LOGIN_ERROR_MESSAGES[knownErrorKey] : undefined
          }
          initialPending={start.pending}
          returnTo={returnTo}
        />
      )}
    </>
  );
}
