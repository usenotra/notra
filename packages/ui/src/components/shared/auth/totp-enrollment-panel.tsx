"use client";

import { CheckmarkCircle02Icon, Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { TOTP_CODE_LENGTH } from "@notra/schemas/constants/dashboard/auth";
import { DEFAULT_TOTP_ENROLLMENT_PANEL_LABELS } from "@notra/ui/constants/auth-labels";

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
  copyLabel,
  copiedLabel,
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
          aria-label={copied ? copiedLabel : copyLabel}
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
  submitLabel,
  cancelLabel,
  doneLabel,
  onSubmit,
  onCancel,
  onDone,
  labels,
}: TotpEnrollmentPanelProps) {
  const l = { ...DEFAULT_TOTP_ENROLLMENT_PANEL_LABELS, ...labels };
  const [step, setStep] = useState<EnrollmentStep>("scan");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      result = { ok: false, message: l.errorFallback };
    }
    if (!isMountedRef.current) {
      return;
    }
    setIsPending(false);

    if (!result.ok) {
      setError(result.message || l.errorFallback);
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
        {isFirstStep ? (cancelLabel ?? l.cancel) : l.back}
      </Button>
    );

  const qrAltText = l.qrAlt(accountLabel);

  let content: React.ReactNode;

  if (step === "backup" && backupCodes) {
    content = (
      <BackupCodesPanel
        accountLabel={accountLabel}
        codes={backupCodes}
        doneLabel={doneLabel ?? l.done}
        labels={l.backupCodesPanel}
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
          label={l.codeLabel}
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
            {isPending && (
              <Loader2Icon className="animate-spin" />
            )}
            {submitLabel ?? l.submit}
          </Button>
        </StepActions>
      </form>
    );
  } else if (step === "manual") {
    content = (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {l.manualInstructions}
        </p>
        <CopyValueField
          copiedLabel={l.valueCopied(l.setupKey)}
          copyLabel={l.copyValue(l.setupKey)}
          display={formatSecret(secret)}
          label={l.setupKey}
          value={secret}
        />
        <CopyValueField
          copiedLabel={l.valueCopied(l.setupUri)}
          copyLabel={l.copyValue(l.setupUri)}
          label={l.setupUri}
          value={otpauthUri}
        />
        <StepActions
          secondary={
            <Button
              className="px-0"
              onClick={() => setStep("scan")}
              type="button"
              variant="link"
            >
              {l.scanInstead}
            </Button>
          }
        >
          {secondaryButton}
          <Button onClick={() => setStep("code")} type="button">
            {l.continue}
          </Button>
        </StepActions>
      </div>
    );
  } else {
    content = (
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          {l.scanInstructions}
        </p>
        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-xs ring-1 ring-black/5">
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
              {l.cantScan}
            </Button>
          }
        >
          {secondaryButton}
          <Button onClick={() => setStep("code")} type="button">
            {l.continue}
          </Button>
        </StepActions>
      </div>
    );
  }

  return <StepTransition stepKey={step}>{content}</StepTransition>;
}
