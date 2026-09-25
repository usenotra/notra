"use client";

import { TOTP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import type { EmailVerificationFormProps } from "../../../types/auth";
import { CtaButton } from "../cta-button";
import { AuthFormHeader } from "./auth-form-header";
import { TotpCodeInput } from "./totp-code-input";

const VERIFY_ERROR_FALLBACK = "Verification failed. Please try again.";

export function EmailVerificationForm({
  step,
  returnTo,
  onResult,
  verifyEmailCode,
}: EmailVerificationFormProps) {
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const requestIdRef = useRef(0);

  async function handleVerify(submittedCode: string) {
    if (submittedCode.length !== TOTP_CODE_LENGTH || isPending) {
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setFormError(null);
    setIsPending(true);

    const result = await verifyEmailCode({
      pendingAuthenticationToken: step.pendingAuthenticationToken,
      code: submittedCode,
      returnTo,
    }).catch(() => null);

    if (requestIdRef.current !== requestId) {
      return;
    }
    if (result && onResult(result)) {
      return;
    }
    setFormError(
      result?.status === "error" ? result.message : VERIFY_ERROR_FALLBACK
    );
    setCode("");
    setIsPending(false);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={`We sent a 6-digit code to ${step.email || "your email address"}. Enter it below to continue.`}
        title="Check your email"
      />

      <form
        aria-busy={isPending}
        className="grid gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleVerify(code);
        }}
      >
        <TotpCodeInput
          autoFocus
          disabled={isPending}
          error={formError}
          id="verification-code"
          label="Verification code"
          onChange={setCode}
          onComplete={handleVerify}
          value={code}
        />

        <div>
          <CtaButton
            className="w-full"
            disabled={isPending || code.length !== TOTP_CODE_LENGTH}
            type="submit"
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify email"
            )}
          </CtaButton>
        </div>
      </form>
    </div>
  );
}
