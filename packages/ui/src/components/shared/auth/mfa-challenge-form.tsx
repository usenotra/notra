"use client";

import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import type { MfaChallengeFormProps } from "../../../lib/auth-types";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { CtaButton } from "../cta-button";
import { AuthFormError } from "./auth-form-error";
import { AuthFormHeader } from "./auth-form-header";
import { TOTP_CODE_LENGTH, TotpCodeInput } from "./totp-code-input";

const MFA_ERROR_FALLBACK = "That code didn't work. Please try again.";
const BACKUP_CODE_MIN_LENGTH = 8;

export function MfaChallengeForm({
  pendingAuthenticationToken,
  authenticationChallengeId,
  email,
  returnTo,
  recoveryToken,
  onSuccess,
  onBack,
  onRecovered,
  verifyMfaCode,
  redeemBackupCode,
}: MfaChallengeFormProps) {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const requestIdRef = useRef(0);

  const canRedeemBackupCode = Boolean(recoveryToken && redeemBackupCode);

  function nextRequestId() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    return requestId;
  }

  async function handleVerify(submittedCode: string) {
    if (submittedCode.length !== TOTP_CODE_LENGTH || isPending) {
      return;
    }

    const requestId = nextRequestId();
    setFormError(null);
    setIsPending(true);

    const result = await verifyMfaCode({
      pendingAuthenticationToken,
      authenticationChallengeId,
      code: submittedCode,
      returnTo,
    }).catch(() => null);

    if (requestIdRef.current !== requestId) {
      return;
    }

    if (result?.status === "success") {
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.assign(result.redirectTo);
      }
      return;
    }

    setFormError(
      result?.status === "error"
        ? result.message || MFA_ERROR_FALLBACK
        : MFA_ERROR_FALLBACK
    );
    setCode("");
    setIsPending(false);
  }

  async function handleBackupCode() {
    if (!(recoveryToken && redeemBackupCode) || isPending) {
      return;
    }

    const requestId = nextRequestId();
    setFormError(null);
    setIsPending(true);

    const result = await redeemBackupCode({
      recoveryToken,
      code: backupCode,
      returnTo,
    }).catch(() => null);

    if (requestIdRef.current !== requestId) {
      return;
    }

    if (result?.status === "recovered") {
      onRecovered?.(result.email);
      return;
    }

    if (result?.status === "success") {
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.assign(result.redirectTo);
      }
      return;
    }

    setFormError(
      result?.status === "error"
        ? result.message || MFA_ERROR_FALLBACK
        : MFA_ERROR_FALLBACK
    );
    setIsPending(false);
  }

  function switchMode(next: "totp" | "backup") {
    setMode(next);
    setFormError(null);
    setCode("");
    setBackupCode("");
  }

  if (mode === "backup") {
    return (
      <div className="flex w-full flex-col gap-5">
        <AuthFormHeader
          description="Enter one of the backup codes you saved when you set up two-factor authentication. Each code works once."
          title="Use a backup code"
        />

        <form
          aria-busy={isPending}
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleBackupCode();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="backup-code">Backup code</Label>
            <Input
              autoCapitalize="off"
              autoComplete="off"
              autoFocus
              className="h-11 rounded-xl px-4 font-mono tracking-wider"
              disabled={isPending}
              id="backup-code"
              onChange={(event) => setBackupCode(event.target.value)}
              placeholder="xxxx-xxxx"
              spellCheck={false}
              value={backupCode}
            />
          </div>

          <div>
            <AuthFormError className="mb-4" error={formError} />
            <CtaButton
              className="w-full"
              disabled={
                isPending ||
                backupCode.replaceAll("-", "").trim().length <
                  BACKUP_CODE_MIN_LENGTH
              }
              type="submit"
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Use backup code"
              )}
            </CtaButton>
          </div>
        </form>

        <Button
          className="mx-auto text-muted-foreground"
          disabled={isPending}
          onClick={() => switchMode("totp")}
          type="button"
          variant="link"
        >
          Use my authenticator app instead
        </Button>
      </div>
    );
  }

  const description = email
    ? `Enter the 6-digit code from your authenticator app to finish signing in as ${email}.`
    : "Enter the 6-digit code from your authenticator app to finish signing in.";

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description}
        title="Two-factor authentication"
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
          id="mfa-code"
          label="Authentication code"
          onChange={setCode}
          onComplete={handleVerify}
          value={code}
        />

        <div>
          <AuthFormError className="mb-4" error={formError} />

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
              "Verify code"
            )}
          </CtaButton>
        </div>
      </form>

      <div className="flex flex-col items-center gap-1">
        {canRedeemBackupCode && (
          <Button
            className="text-muted-foreground"
            disabled={isPending}
            onClick={() => switchMode("backup")}
            type="button"
            variant="link"
          >
            Lost your device? Use a backup code
          </Button>
        )}
        {onBack && (
          <Button
            className="text-muted-foreground"
            disabled={isPending}
            onClick={onBack}
            type="button"
            variant="link"
          >
            Back to sign in
          </Button>
        )}
      </div>
    </div>
  );
}
