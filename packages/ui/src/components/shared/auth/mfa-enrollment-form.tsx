"use client";

import { useRef } from "react";

import type {
  MfaEnrollmentFormProps,
  TotpVerifyResult,
} from "../../../lib/auth-types";
import { AuthFormHeader } from "./auth-form-header";
import { TotpEnrollmentPanel } from "./totp-enrollment-panel";

const ENROLLMENT_ERROR_FALLBACK = "That code didn't work. Please try again.";

export function MfaEnrollmentForm({
  step,
  returnTo,
  onResult,
  onFinish,
  onBack,
  verifyMfaCode,
}: MfaEnrollmentFormProps) {
  const redirectToRef = useRef<string | null>(null);

  async function handleSubmit(code: string): Promise<TotpVerifyResult> {
    const result = await verifyMfaCode({
      pendingAuthenticationToken: step.pendingAuthenticationToken,
      authenticationChallengeId: step.authenticationChallengeId,
      code,
      returnTo,
    }).catch(() => null);

    if (!result) {
      return { ok: false, message: ENROLLMENT_ERROR_FALLBACK };
    }
    // Hold the redirect until the user has seen their backup codes.
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
          ? result.message || ENROLLMENT_ERROR_FALLBACK
          : ENROLLMENT_ERROR_FALLBACK,
    };
  }

  const description = step.email
    ? `Your organization requires a second step when signing in as ${step.email}.`
    : "Your organization requires a second step when signing in.";

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description}
        title="Set up two-factor authentication"
      />
      <TotpEnrollmentPanel
        accountLabel={step.email || undefined}
        cancelLabel="Back to sign in"
        doneLabel="Continue to Notra"
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
        submitLabel="Verify and sign in"
      />
    </div>
  );
}
