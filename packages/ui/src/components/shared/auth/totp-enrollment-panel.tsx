"use client";

import { CheckmarkCircle02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TOTP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type {
  CopyValueFieldProps,
  EnrollmentStep,
  StepActionsProps,
  TotpEnrollmentPanelProps,
  TotpVerifyResult,
} from "../../../types/auth";
import { Button } from "../../ui/button";
import { BackupCodesPanel } from "../security/backup-codes-panel";
import { StepTransition } from "../security/step-transition";
import { TotpCodeInput } from "./totp-code-input";

const ENROLLMENT_ERROR_FALLBACK = "That code didn't work. Please try again.";
const COPIED_RESET_MS = 2000;
const QR_CODE_SIZE = 176;
const WHITESPACE_REGEX = /\s+/g;
const SECRET_GROUP_REGEX = /.{1,4}/g;

function formatSecret(secret: string) {
  const compact = secret.replace(WHITESPACE_REGEX, "");
  return compact.match(SECRET_GROUP_REGEX)?.join(" ") ?? compact;
}

function CopyValueField({
  label,
  value,
  display,
}: CopyValueFieldProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, COPIED_RESET_MS);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 select-all truncate rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs tracking-wider">
          {display ?? value}
        </code>
        <Button
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={copy}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon
            className={copied ? "text-success" : undefined}
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
          />
        </Button>
      </div>
    </div>
  );
}

function StepActions({ secondary, children }: StepActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>{secondary}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">{children}</div>
    </div>
  );
}

export function TotpEnrollmentPanel({
  qrCode,
  secret,
  otpauthUri,
  accountLabel,
  submitLabel = "Turn on two-factor",
  cancelLabel = "Cancel",
  doneLabel = "Done",
  onSubmit,
  onCancel,
  onDone,
}: TotpEnrollmentPanelProps) {
  const [step, setStep] = useState<EnrollmentStep>("scan");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  async function handleSubmit(submittedCode: string) {
    if (submittedCode.length !== TOTP_CODE_LENGTH || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    let result: TotpVerifyResult;
    try {
      result = await onSubmit({ code: submittedCode });
    } catch {
      result = { ok: false, message: ENROLLMENT_ERROR_FALLBACK };
    } finally {
      setIsPending(false);
    }

    if (!result.ok) {
      setError(result.message || ENROLLMENT_ERROR_FALLBACK);
      setCode("");
      return;
    }

    if (result.backupCodes && result.backupCodes.length > 0) {
      setBackupCodes(result.backupCodes);
      setStep("backup");
      return;
    }

    onDone?.();
  }

  // One secondary action next to the primary one: leaving on the first step
  // cancels the whole enrollment, on later steps it goes back to the QR code.
  const isFirstStep = step === "scan";
  const secondaryButton =
    isFirstStep && !onCancel ? null : (
      <Button
        disabled={isPending}
        onClick={() => {
          if (isFirstStep) {
            onCancel?.();
            return;
          }
          setError(null);
          setStep("scan");
        }}
        type="button"
        variant="ghost"
      >
        {isFirstStep ? cancelLabel : "Back"}
      </Button>
    );

  const qrAltText = accountLabel
    ? `QR code to add ${accountLabel} to an authenticator app`
    : "QR code to add this account to an authenticator app";

  let content: React.ReactNode;

  if (step === "backup" && backupCodes) {
    content = (
      <BackupCodesPanel
        accountLabel={accountLabel}
        codes={backupCodes}
        doneLabel={doneLabel}
        onDone={onDone}
      />
    );
  } else if (step === "code") {
    content = (
      <form
        aria-busy={isPending}
        className="grid gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(code);
        }}
      >
        <TotpCodeInput
          autoFocus
          disabled={isPending}
          error={error}
          id="totp-enrollment-code"
          label="Enter the 6-digit code from your app"
          onChange={setCode}
          onComplete={handleSubmit}
          value={code}
        />
        <StepActions>
          {secondaryButton}
          <Button
            disabled={isPending || code.length !== TOTP_CODE_LENGTH}
            type="submit"
          >
            {isPending && <Loader2Icon className="animate-spin" />}
            {submitLabel}
          </Button>
        </StepActions>
      </form>
    );
  } else if (step === "manual") {
    content = (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          In your authenticator app, add an account with this key and
          time-based codes.
        </p>
        <CopyValueField
          display={formatSecret(secret)}
          label="Setup key"
          value={secret}
        />
        <CopyValueField label="Setup URI" value={otpauthUri} />
        <StepActions
          secondary={
            <Button
              className="px-0"
              onClick={() => setStep("scan")}
              type="button"
              variant="link"
            >
              Scan QR code instead
            </Button>
          }
        >
          {secondaryButton}
          <Button onClick={() => setStep("code")} type="button">
            Continue
          </Button>
        </StepActions>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          Scan this with 1Password, Google Authenticator, or Authy.
        </p>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-xs ring-1 ring-black/5">
          {/* Data-URI QR code from WorkOS: nothing for next/image to optimize. */}
          <img
            alt={qrAltText}
            className="block"
            height={QR_CODE_SIZE}
            src={qrCode}
            style={{ width: QR_CODE_SIZE, height: QR_CODE_SIZE }}
            width={QR_CODE_SIZE}
          />
        </div>
        <StepActions
          secondary={
            <Button
              className="px-0"
              onClick={() => setStep("manual")}
              type="button"
              variant="link"
            >
              Can&apos;t scan it?
            </Button>
          }
        >
          {secondaryButton}
          <Button onClick={() => setStep("code")} type="button">
            Continue
          </Button>
        </StepActions>
      </div>
    );
  }

  return <StepTransition stepKey={step}>{content}</StepTransition>;
}
