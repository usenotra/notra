"use client";

import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import type { EmailVerificationFormProps } from "../../../lib/auth-types";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { CtaButton } from "../cta-button";
import { AuthFormError } from "./auth-form-error";
import { AuthFormHeader } from "./auth-form-header";

const NON_DIGIT_REGEX = /\D/g;
const CODE_LENGTH = 6;
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

  async function handleVerify() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setFormError(null);
    setIsPending(true);

    const result = await verifyEmailCode({
      pendingAuthenticationToken: step.pendingAuthenticationToken,
      code,
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
    setIsPending(false);
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={`We sent a 6-digit code to ${step.email || "your email address"}. Enter it below to continue.`}
        title="Check your email"
      />

      <form
        className="grid gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleVerify();
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="verification-code">Verification code</Label>
          <Input
            autoComplete="one-time-code"
            autoFocus
            className="h-11 rounded-xl px-3.5 text-center font-mono text-lg tracking-[0.5em]"
            disabled={isPending}
            id="verification-code"
            inputMode="numeric"
            maxLength={CODE_LENGTH}
            onChange={(event) =>
              setCode(event.target.value.replace(NON_DIGIT_REGEX, ""))
            }
            placeholder="000000"
            value={code}
          />
        </div>

        <div>
          <AuthFormError className="mb-4" error={formError} />

          <CtaButton
            className="w-full"
            disabled={isPending || code.length !== CODE_LENGTH}
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
