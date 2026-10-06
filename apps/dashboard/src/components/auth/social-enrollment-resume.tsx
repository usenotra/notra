"use client";

import type { AuthFlowResult } from "@notra/schemas/types/dashboard/auth";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { LoginForm } from "@/components/auth/login-form";
import { resumeSocialEnrollmentAction } from "@/lib/auth/mfa-actions";
import type { SocialEnrollmentResumeProps } from "@/types/auth/login-page";

export function SocialEnrollmentResume({
  flowId,
  returnTo,
}: SocialEnrollmentResumeProps) {
  const t = useTranslations("auth.socialEnrollment");
  const resumeErrorFallback = t("resumeFailed");
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
        setResult({ status: "error", message: resumeErrorFallback });
      });
  }, [flowId, returnTo, resumeErrorFallback]);

  if (!result) {
    return (
      <div
        aria-busy="true"
        className="text-muted-foreground flex min-h-48 items-center justify-center"
        role="status"
      >
        <Spinner className="size-5" />
        <span className="sr-only">{t("preparing")}</span>
      </div>
    );
  }

  if (result.status === "mfa-enrollment-required") {
    return <LoginForm initialPending={result} returnTo={returnTo} />;
  }

  return (
    <LoginForm
      initialError={
        result.status === "error" ? result.message : resumeErrorFallback
      }
      returnTo={returnTo}
    />
  );
}
