"use client";

import type { AuthFlowResult } from "@notra/schemas/types/dashboard/auth";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { resumeSocialEnrollmentAction } from "@/lib/auth/mfa-actions";
import type { SocialEnrollmentResumeProps } from "@/types/auth/login-page";

const RESUME_ERROR_FALLBACK =
  "Couldn't continue the two-factor setup. Please sign in again.";

export function SocialEnrollmentResume({
  flowId,
  returnTo,
}: SocialEnrollmentResumeProps) {
  const [result, setResult] = useState<AuthFlowResult | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    resumeSocialEnrollmentAction({ flowId, returnTo })
      .then(setResult)
      .catch(() => {
        setResult({ status: "error", message: RESUME_ERROR_FALLBACK });
      });
  }, [flowId, returnTo]);

  if (!result) {
    return (
      <div
        aria-busy="true"
        className="text-muted-foreground flex min-h-48 items-center justify-center"
        role="status"
      >
        <Loader2Icon aria-hidden className="size-5 animate-spin" />
        <span className="sr-only">Preparing two-factor setup</span>
      </div>
    );
  }

  if (result.status === "mfa-enrollment-required") {
    return <LoginForm initialPending={result} returnTo={returnTo} />;
  }

  return (
    <LoginForm
      initialError={
        result.status === "error" ? result.message : RESUME_ERROR_FALLBACK
      }
      returnTo={returnTo}
    />
  );
}
