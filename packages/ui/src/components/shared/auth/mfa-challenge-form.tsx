"use client";

import {
  BACKUP_CODE_LENGTH,
  TOTP_CODE_LENGTH,
} from "@notra/schemas/constants/dashboard/auth";
import { normalizeBackupCode } from "@notra/schemas/utils/auth";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";

import type {
  ChallengeMode,
  MfaChallengeFormProps,
  MfaSubmitButtonProps,
} from "../../../types/auth";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { BackupCodesPanel } from "../security/backup-codes-panel";
import { CtaButton } from "../cta-button";
import { AuthFormError } from "./auth-form-error";
import { AuthFormHeader } from "./auth-form-header";
import { TotpCodeInput } from "./totp-code-input";

const MFA_ERROR_FALLBACK = "That code didn't work. Please try again.";

function SubmitButton({
  isPending,
  disabled,
  pendingLabel,
  label,
}: MfaSubmitButtonProps) {
  return (
    <CtaButton className="w-full" disabled={disabled} type="submit">
      {isPending ? (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </CtaButton>
  );
}

export function MfaChallengeForm({
  step,
  returnTo,
  onResult,
  onFinish,
  onBack,
  onRecovered,
  verifyMfaCode,
  redeemBackupCode,
}: MfaChallengeFormProps) {
  const [mode, setMode] = useState<ChallengeMode>("totp");
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [issuedCodes, setIssuedCodes] = useState<{
    codes: string[];
    redirectTo: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const requestIdRef = useRef(0);

  function beginRequest() {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setFormError(null);
    setIsPending(true);
    return () => requestIdRef.current === requestId;
  }

  function fail(message: string | undefined) {
    setFormError(message || MFA_ERROR_FALLBACK);
    setCode("");
    setBackupCode("");
    setIsPending(false);
  }

  async function handleVerify(submittedCode: string) {
    if (submittedCode.length !== TOTP_CODE_LENGTH || isPending) {
      return;
    }
    const isCurrent = beginRequest();
    const result = await verifyMfaCode({
      pendingAuthenticationToken: step.pendingAuthenticationToken,
      authenticationChallengeId: step.authenticationChallengeId,
      code: submittedCode,
      returnTo,
    }).catch(() => null);
    if (!isCurrent()) {
      return;
    }
    if (result?.status === "enrolled") {
      setIsPending(false);
      setIssuedCodes({
        codes: result.backupCodes,
        redirectTo: result.redirectTo,
      });
      return;
    }
    if (result && onResult(result)) {
      return;
    }
    fail(result?.status === "error" ? result.message : undefined);
  }

  async function handleBackupCode() {
    if (isPending || !backupCodeReady) {
      return;
    }
    const isCurrent = beginRequest();
    const result = await redeemBackupCode({
      authenticationChallengeId: step.authenticationChallengeId,
      code: backupCode,
      returnTo,
    }).catch(() => null);
    if (!isCurrent()) {
      return;
    }
    if (result?.status === "recovered") {
      onRecovered(result.email);
      return;
    }
    fail(result?.message);
  }

  function switchMode(next: ChallengeMode) {
    setMode(next);
    setFormError(null);
    setCode("");
    setBackupCode("");
  }

  const backupCodeReady =
    normalizeBackupCode(backupCode).length === BACKUP_CODE_LENGTH;

  if (issuedCodes) {
    return (
      <div className="flex w-full flex-col gap-5">
        <AuthFormHeader
          description="You're signed in. Save these backup codes now: each one lets you in once if you lose your authenticator app."
          title="Your backup codes"
        />
        <BackupCodesPanel
          accountLabel={step.email || undefined}
          codes={issuedCodes.codes}
          doneLabel="Continue"
          onDone={() => onFinish(issuedCodes.redirectTo)}
        />
      </div>
    );
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
            <SubmitButton
              disabled={isPending || !backupCodeReady}
              isPending={isPending}
              label="Use backup code"
              pendingLabel="Checking..."
            />
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

  const description = step.email
    ? `Enter the 6-digit code from your authenticator app to finish signing in as ${step.email}.`
    : "Enter the 6-digit code from your authenticator app to finish signing in.";

  return (
    <div className="flex w-full flex-col gap-5">
      <AuthFormHeader
        description={description}
        title="Two-factor authentication"
      />
      <form
        aria-busy={isPending}
        className="mt-4 grid gap-0 max-[360px]:mt-7"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleVerify(code);
        }}
      >
        <TotpCodeInput
          autoFocus
          className={`gap-2 [&>div:last-child]:min-h-7 max-[360px]:[&>div:last-child]:min-h-8 [&>div:last-child]:text-center [&>div:last-child>p]:text-xs [&>label]:sr-only ${formError ? "mfa-code-shake" : ""}`}
          disabled={isPending}
          error={formError}
          id="mfa-code"
          label="Authentication code"
          onChange={setCode}
          onComplete={handleVerify}
          value={code}
        />
        <SubmitButton
          disabled={isPending || code.length !== TOTP_CODE_LENGTH}
          isPending={isPending}
          label="Verify code"
          pendingLabel="Verifying..."
        />
      </form>
      <div className="flex flex-col items-center gap-1">
        <Button
          className="text-muted-foreground"
          disabled={isPending}
          onClick={() => switchMode("backup")}
          type="button"
          variant="link"
        >
          Lost your device? Use a backup code
        </Button>
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
