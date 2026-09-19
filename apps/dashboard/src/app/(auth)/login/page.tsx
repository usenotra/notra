import { LoginErrorTracker } from "@/components/auth/login-error-tracker";
import { LoginForm } from "@/components/auth/login-form";

export const instant = true;

const ERROR_MESSAGES: Record<string, string> = {
  "social-sign-in-failed": "Social sign-in failed. Please try again.",
  "external-login-failed":
    "Authorization could not be completed. Please try again.",
};

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
  const knownErrorKey =
    errorKey && errorKey in ERROR_MESSAGES ? errorKey : undefined;

  return (
    <div className="mx-auto w-full max-w-md rounded-md p-6 lg:px-8 lg:py-10">
      {knownErrorKey ? <LoginErrorTracker errorCode={knownErrorKey} /> : null}
      <LoginForm
        initialError={errorKey ? ERROR_MESSAGES[errorKey] : undefined}
        initialPendingVerification={
          verify
            ? { pendingAuthenticationToken: verify, email: email ?? "" }
            : undefined
        }
        returnTo={returnTo}
      />
    </div>
  );
}
