"use client";

import { DEFAULT_MFA_ENROLLMENT_FORM_LABELS } from "@notra/ui/constants/auth-labels";
import { useRef } from "react";

import type {
  MfaEnrollmentFormProps,
  TotpEnrollmentSubmission,
  TotpVerifyResult,
} from "../../../types/auth";
import { AuthFormHeader } from "./auth-form-header";
import { TotpEnrollmentPanel } from "./totp-enrollment-panel";

export function MfaEnrollmentForm({
  step,
  returnTo,
  onResult,
  onFinish,
  onBack,
  verifyMfaCode,
  labels,
}: MfaEnrollmentFormProps) {
  const l = { ...DEFAULT_MFA_ENROLLMENT_FORM_LABELS, ...labels };
  const redirectToRef = useRef<string | null>(null);

  async function handleSubmit({
    code,
  }: TotpEnrollmentSubmission): Promise<TotpVerifyResult> {
    const result = await verifyMfaCode({
      pendingAuthenticationToken: step.pendingAuthenticationToken,
      authenticationChallengeId: step.authenticationChallengeId,
      code,
      returnTo,
    }).catch(() => null);

    if (!result) {
      return { ok: false, message: l.errorFallback };
    }
    if (result.status === "enrolled") {
      redirectToRef.current = result.redirectTo;
      return { ok: true, backupCodes: result.backupCodes };
    }
    if (onResult(result)) {
      return { ok: true };
    }
    return {
      ok: false,
      message:
        result.status === "error"
          ? result.message || l.errorFallback
          : l.errorFallback,
    };
  }

  const description = l.description(step.email || undefined);

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description}
        title={l.title}
      />
      <TotpEnrollmentPanel
        accountLabel={step.email || undefined}
        cancelLabel={l.cancel}
        doneLabel={l.done}
        labels={l.enrollmentPanel}
        onCancel={onBack}
        onDone={() => {
          if (redirectToRef.current) {
            onFinish(redirectToRef.current);
          }
        }}
        onSubmit={handleSubmit}
        otpauthUri={step.otpauthUri}
        qrCode={step.qrCode}
        secret={step.secret}
        submitLabel={l.submit}
      />
    </div>
  );
}
