"use client";

import {
  Add01Icon,
  ArrowReloadHorizontalIcon,
  Delete02Icon,
  SquareLockPasswordIcon,
  TwoFactorAccessIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type {
  BackupCodesOutcome,
  TotpFactorSummary,
  TwoFactorSettingsProps,
} from "../../../lib/security-types";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { TotpEnrollmentPanel } from "../auth/totp-enrollment-panel";
import { BackupCodesPanel } from "./backup-codes-panel";
import { StepTransition } from "./step-transition";
import { formatSecurityDate } from "./format-security-date";
import { SecurityLoadError } from "./security-load-error";
import { SecurityMethodRow } from "./security-method-row";

function BackupCodesRow({
  remaining,
  accountLabel,
  onRegenerate,
}: {
  remaining: number | null | undefined;
  accountLabel?: string;
  onRegenerate: () => Promise<BackupCodesOutcome>;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setIsRegenerating(true);
    setError(null);
    const result = await onRegenerate().catch(() => ({
      ok: false as const,
      message: "Couldn't generate backup codes. Please try again.",
    }));
    setIsRegenerating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCodes(result.codes);
  }

  let description = "One-time codes for when your device isn't around.";
  if (typeof remaining === "number" && remaining > 0) {
    description = `${remaining} unused ${remaining === 1 ? "code" : "codes"} left.`;
  } else if (remaining === 0) {
    description = "All codes used. Generate a new set.";
  }

  return (
    <SecurityMethodRow
      action={
        codes ? null : (
          <Button
            disabled={isRegenerating}
            onClick={regenerate}
            size="sm"
            type="button"
            variant="outline"
          >
            {isRegenerating ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <HugeiconsIcon
                data-icon="inline-start"
                icon={ArrowReloadHorizontalIcon}
              />
            )}
            Regenerate
          </Button>
        )
      }
      description={error ?? description}
      icon={SquareLockPasswordIcon}
      title="Backup codes"
    >
      {codes ? (
        <BackupCodesPanel
          accountLabel={accountLabel}
          codes={codes}
          onDone={() => setCodes(null)}
        />
      ) : null}
    </SecurityMethodRow>
  );
}

function FactorList({
  factors,
  removingFactorId,
  onRemoveFactor,
}: {
  factors: TotpFactorSummary[];
  removingFactorId: string | null;
  onRemoveFactor: (factorId: string) => void;
}) {
  return (
    <ul className="grid gap-3">
      {factors.map((factor) => {
        const addedOn = formatSecurityDate(factor.createdAt);
        const isRemoving = removingFactorId === factor.id;
        return (
          <li
            className="flex items-center justify-between gap-3 text-sm"
            key={factor.id}
          >
            <div className="min-w-0">
              <p className="font-medium">
                {factor.issuer ?? "Authenticator app"}
              </p>
              {addedOn && (
                <p className="text-muted-foreground text-xs">
                  Added {addedOn}
                </p>
              )}
            </div>
            <Button
              disabled={isRemoving}
              onClick={() => onRemoveFactor(factor.id)}
              size="sm"
              type="button"
              variant="outline"
            >
              {isRemoving ? (
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
              ) : (
                <HugeiconsIcon data-icon="inline-start" icon={Delete02Icon} />
              )}
              Remove
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function TwoFactorSettings({
  factors,
  status,
  enrollment,
  isStartingEnrollment = false,
  removingFactorId = null,
  accountLabel,
  onStartEnrollment,
  onVerifyEnrollment,
  onCancelEnrollment,
  onEnrollmentDone,
  onRemoveFactor,
  onRetry,
  backupCodesRemaining,
  onRegenerateBackupCodes,
}: TwoFactorSettingsProps) {
  if (status === "loading") {
    return <Skeleton className="h-[4.5rem] rounded-lg" />;
  }

  if (status === "error") {
    return (
      <SecurityLoadError
        message="Couldn't load your two-factor settings."
        onRetry={onRetry}
      />
    );
  }

  const isEnabled = factors.length > 0;

  let body: ReactNode = null;
  if (enrollment) {
    body = (
      <TotpEnrollmentPanel
        accountLabel={accountLabel}
        onCancel={onCancelEnrollment}
        onDone={onEnrollmentDone}
        onSubmit={onVerifyEnrollment}
        otpauthUri={enrollment.otpauthUri}
        qrCode={enrollment.qrCode}
        secret={enrollment.secret}
      />
    );
  } else if (isEnabled) {
    body = (
      <FactorList
        factors={factors}
        onRemoveFactor={onRemoveFactor}
        removingFactorId={removingFactorId}
      />
    );
  }

  const action =
    isEnabled || enrollment ? null : (
      <Button
        disabled={isStartingEnrollment}
        onClick={onStartEnrollment}
        size="sm"
        type="button"
      >
        {isStartingEnrollment ? (
          <Loader2Icon className="animate-spin" data-icon="inline-start" />
        ) : (
          <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
        )}
        Set up
      </Button>
    );

  let bodyKey = "empty";
  if (enrollment) {
    bodyKey = "enrollment";
  } else if (isEnabled) {
    bodyKey = "factors";
  }

  return (
    <div className="divide-y">
      <SecurityMethodRow
        action={action}
        description={
          isEnabled
            ? "Required when you sign in with your password."
            : "Codes from 1Password, Google Authenticator, or Authy."
        }
        icon={TwoFactorAccessIcon}
        title={
          <span className="flex items-center gap-2">
            Authenticator app
            {isEnabled && <Badge variant="success">On</Badge>}
          </span>
        }
      >
        {body && <StepTransition stepKey={bodyKey}>{body}</StepTransition>}
      </SecurityMethodRow>
      {isEnabled && !enrollment && onRegenerateBackupCodes && (
        <BackupCodesRow
          accountLabel={accountLabel}
          onRegenerate={onRegenerateBackupCodes}
          remaining={backupCodesRemaining}
        />
      )}
    </div>
  );
}
