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
  enrollment,
  returnTo,
  onSuccess,
  onBack,
  verifyMfaCode,
}: MfaEnrollmentFormProps) {
  const redirectToRef = useRef<string | null>(null);

  function finish() {
    if (onSuccess) {
      onSuccess();
      return;
    }
    if (redirectToRef.current) {
      window.location.assign(redirectToRef.current);
    }
  }

  async function handleSubmit(code: string): Promise<TotpVerifyResult> {
    const result = await verifyMfaCode({
      pendingAuthenticationToken: enrollment.pendingAuthenticationToken,
      authenticationChallengeId: enrollment.authenticationChallengeId,
      code,
      returnTo,
      enrollment: true,
    }).catch(() => null);

    if (result?.status === "success") {
      redirectToRef.current = result.redirectTo;
      if (!result.backupCodes?.length) {
        finish();
      }
      return { ok: true, backupCodes: result.backupCodes };
    }

    return {
      ok: false,
      message:
        result?.status === "error"
          ? result.message || ENROLLMENT_ERROR_FALLBACK
          : ENROLLMENT_ERROR_FALLBACK,
    };
  }

  const description = enrollment.email
    ? `Your organization requires a second step when signing in as ${enrollment.email}.`
    : "Your organization requires a second step when signing in.";

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description}
        title="Set up two-factor authentication"
      />
      <TotpEnrollmentPanel
        accountLabel={enrollment.email || undefined}
        cancelLabel="Back to sign in"
        doneLabel="Continue to Notra"
        onCancel={onBack}
        onDone={finish}
        onSubmit={handleSubmit}
        otpauthUri={enrollment.otpauthUri}
        qrCode={enrollment.qrCode}
        secret={enrollment.secret}
        submitLabel="Verify and sign in"
      />
    </div>
  );
}
