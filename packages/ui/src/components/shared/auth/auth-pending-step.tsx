"use client";

import type { AuthPendingStepProps } from "../../../types/auth";
import { EmailVerificationForm } from "./email-verification-form";
import { MfaChallengeForm } from "./mfa-challenge-form";
import { MfaEnrollmentForm } from "./mfa-enrollment-form";

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
  labels,
}: AuthPendingStepProps) {
  switch (step.status) {
    case "verification-required":
      return (
        <EmailVerificationForm
          labels={labels?.emailVerification}
          onResult={onResult}
          returnTo={returnTo}
          step={step}
          verifyEmailCode={verifyEmailCode}
        />
      );
    case "mfa-required":
      return (
        <MfaChallengeForm
          labels={labels?.mfaChallenge}
          onBack={onBack}
          onFinish={onFinish}
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
          labels={labels?.mfaEnrollment}
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
