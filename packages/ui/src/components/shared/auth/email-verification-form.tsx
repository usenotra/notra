"use client";


import { TOTP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { DEFAULT_EMAIL_VERIFICATION_FORM_LABELS } from "@notra/ui/constants/auth-labels";

import { useRef, useState } from "react";
import type { EmailVerificationFormProps } from "../../../types/auth";
import { CtaButton } from "../cta-button";
import { AuthFormHeader } from "./auth-form-header";
import { TotpCodeInput } from "./totp-code-input";

export function EmailVerificationForm({
  step,
  returnTo,
  onResult,
  verifyEmailCode,
  labels,
}: EmailVerificationFormProps) {
  const l = { ...DEFAULT_EMAIL_VERIFICATION_FORM_LABELS, ...labels };
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
      result?.status === "error" ? result.message : l.errorFallback,
    );
    setCode("");
    setIsPending(false);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={l.description(step.email || undefined)}
        title={l.title}
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
          label={l.codeLabel}
          onChange={setCode}
          onComplete={handleVerify}
          value={code}
        />

        <div>
          <CtaButton
            className="w-full"
            disabled={code.length !== TOTP_CODE_LENGTH}
            loading={isPending}
            type="submit"
          >
            {l.submit}
          </CtaButton>
        </div>
      </form>
    </div>
  );
}
