"use client";

import type { AuthPendingStepProps } from "../../../lib/auth-types";
import { EmailVerificationForm } from "./email-verification-form";
import { MfaChallengeForm } from "./mfa-challenge-form";
import { MfaEnrollmentForm } from "./mfa-enrollment-form";

/** Renders whichever intermediate auth step the server asked for. */
export function AuthPendingStep({
  step,
  returnTo,
  onResult,
  onFinish,
  onBack,
  onRecovered,
  verifyEmailCode,
  verifyMfaCode,
  redeemBackupCode,
}: AuthPendingStepProps) {
  switch (step.status) {
    case "verification-required":
      return (
        <EmailVerificationForm
          onResult={onResult}
          returnTo={returnTo}
          step={step}
          verifyEmailCode={verifyEmailCode}
        />
      );
    case "mfa-required":
      return (
        <MfaChallengeForm
          onBack={onBack}
          onRecovered={onRecovered}
          onResult={onResult}
          redeemBackupCode={redeemBackupCode}
          returnTo={returnTo}
          step={step}
          verifyMfaCode={verifyMfaCode}
        />
      );
    case "mfa-enrollment-required":
      return (
        <MfaEnrollmentForm
          onBack={onBack}
          onFinish={onFinish}
          onResult={onResult}
          returnTo={returnTo}
          step={step}
          verifyMfaCode={verifyMfaCode}
        />
      );
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}
