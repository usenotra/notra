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

export function EmailVerificationForm({
  pendingAuthenticationToken,
  email,
  returnTo,
  onSuccess,
  onMfaRequired,
  onMfaEnrollmentRequired,
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
      pendingAuthenticationToken,
      code,
      returnTo,
    }).catch(() => null);

    if (result?.status === "success") {
      if (requestIdRef.current === requestId) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.assign(result.redirectTo);
        }
      }
      return;
    }

    if (result?.status === "mfa-required" && onMfaRequired) {
      if (requestIdRef.current === requestId) {
        onMfaRequired({
          pendingAuthenticationToken: result.pendingAuthenticationToken,
          authenticationChallengeId: result.authenticationChallengeId,
          email: result.email || email,
          recoveryToken: result.recoveryToken,
        });
      }
      return;
    }

    if (result?.status === "mfa-enrollment-required" && onMfaEnrollmentRequired) {
      if (requestIdRef.current === requestId) {
        onMfaEnrollmentRequired({
          pendingAuthenticationToken: result.pendingAuthenticationToken,
          authenticationChallengeId: result.authenticationChallengeId,
          email: result.email || email,
          qrCode: result.qrCode,
          secret: result.secret,
          otpauthUri: result.otpauthUri,
        });
      }
      return;
    }

    const nextError =
      result?.status === "error"
        ? result.message
        : "Verification failed. Please try again.";

    setFormError((previous) =>
      requestIdRef.current === requestId ? nextError : previous
    );
    setIsPending((previous) =>
      requestIdRef.current === requestId ? false : previous
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={`We sent a 6-digit code to ${email || "your email address"}. Enter it below to continue.`}
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
            maxLength={6}
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
            disabled={isPending || code.length !== 6}
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
