"use client";

import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { StepUpVerificationProps } from "../../../lib/security-types";
import { Button } from "../../ui/button";
import { AuthFormError } from "../auth/auth-form-error";
import { TOTP_CODE_LENGTH, TotpCodeInput } from "../auth/totp-code-input";

type StepUpPhase = "sending" | "sent" | "verifying";

const SEND_ERROR_FALLBACK = "Couldn't send the code. Please try again.";
const VERIFY_ERROR_FALLBACK = "That code didn't work. Please try again.";

/**
 * Email step-up used before sensitive changes. The code is sent as soon as
 * the component mounts, so the user only ever sees the input.
 */
export function StepUpVerification({
  email,
  onSendCode,
  onVerify,
  onCancel,
}: StepUpVerificationProps) {
  const [phase, setPhase] = useState<StepUpPhase>("sending");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);

  async function sendCode() {
    setError(null);
    setPhase("sending");
    const result = await onSendCode().catch(() => ({
      ok: false as const,
      message: SEND_ERROR_FALLBACK,
    }));
    if (!result.ok) {
      setError(result.message || SEND_ERROR_FALLBACK);
    }
    setCode("");
    setPhase("sent");
  }

  useEffect(() => {
    // Guard against StrictMode's double mount so only one email goes out.
    if (sentRef.current) {
      return;
    }
    sentRef.current = true;
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function verify(submittedCode: string) {
    if (submittedCode.length !== TOTP_CODE_LENGTH || phase !== "sent") {
      return;
    }
    setError(null);
    setPhase("verifying");
    const result = await onVerify(submittedCode).catch(() => ({
      ok: false as const,
      message: VERIFY_ERROR_FALLBACK,
    }));
    if (!result.ok) {
      setError(result.message || VERIFY_ERROR_FALLBACK);
      setCode("");
      setPhase("sent");
    }
  }

  const isBusy = phase !== "sent";

  return (
    <form
      aria-busy={isBusy}
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
    >
      <TotpCodeInput
        autoFocus
        disabled={isBusy}
        id="step-up-code"
        label={`Code sent to ${email}`}
        onChange={setCode}
        onComplete={verify}
        value={code}
      />
      <AuthFormError error={error} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          className="px-0"
          disabled={isBusy}
          onClick={sendCode}
          type="button"
          variant="link"
        >
          {phase === "sending" ? "Sending code…" : "Resend code"}
        </Button>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              disabled={phase === "verifying"}
              onClick={onCancel}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          )}
          <Button
            disabled={isBusy || code.length !== TOTP_CODE_LENGTH}
            type="submit"
          >
            {phase === "verifying" && <Loader2Icon className="animate-spin" />}
            Verify
          </Button>
        </div>
      </div>
    </form>
  );
}
