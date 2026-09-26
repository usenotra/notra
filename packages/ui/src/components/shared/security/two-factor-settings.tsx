"use client";

import { Add01Icon, ArrowReloadHorizontalIcon, Delete02Icon, SmartPhone01Icon, SquareLockPasswordIcon, TwoFactorAccessIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";
import { type ReactNode, useState } from "react";

import type {
  BackupCodesRowProps,
  FactorListProps,
  TwoFactorSettingsProps,
} from "../../../types/security";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { TotpEnrollmentPanel } from "../auth/totp-enrollment-panel";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "../responsive-dialog";
import { BackupCodesPanel } from "./backup-codes-panel";
import { SecondFactorConfirm } from "./second-factor-confirm";
import { StepTransition } from "./step-transition";
import { formatSecurityDate } from "./format-security-date";
import { SecurityLoadError } from "./security-load-error";
import { SecurityMethodRow } from "./security-method-row";

function BackupCodesRow({
  remaining,
  accountLabel,
  onRegenerate,
}: BackupCodesRowProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);

  async function regenerate(confirmationCode: string) {
    const result = await onRegenerate(confirmationCode);
    if (!result.ok) {
      return result;
    }
    setIsConfirming(false);
    setCodes(result.codes);
    return { ok: true as const };
  }

  let description = "One-time codes for when your device isn't around.";
  if (typeof remaining === "number" && remaining > 0) {
    description = `${remaining} unused ${remaining === 1 ? "code" : "codes"} left.`;
  } else if (remaining === 0) {
    description = "All codes used. Generate a new set.";
  }

  let body: ReactNode = null;
  let bodyKey = "empty";
  if (codes) {
    bodyKey = "codes";
    body = (
      <BackupCodesPanel
        accountLabel={accountLabel}
        codes={codes}
        onDone={() => setCodes(null)}
      />
    );
  } else if (isConfirming) {
    bodyKey = "confirm";
    body = (
      <SecondFactorConfirm
        confirmLabel="Generate new codes"
        description="Your current codes stop working once new ones are generated. Confirm with your authenticator app or an unused backup code."
        onCancel={() => setIsConfirming(false)}
        onConfirm={regenerate}
        title="Regenerate backup codes?"
      />
    );
  }

  return (
    <SecurityMethodRow
      action={
        codes || isConfirming ? null : (
          <Button
            onClick={() => setIsConfirming(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={ArrowReloadHorizontalIcon}
            />
            Regenerate
          </Button>
        )
      }
      description={description}
      icon={SquareLockPasswordIcon}
      title="Backup codes"
    >
      {body && <StepTransition stepKey={bodyKey}>{body}</StepTransition>}
    </SecurityMethodRow>
  );
}

function FactorList({
  factors,
  removingFactorId,
  onRemoveFactor,
}: FactorListProps) {
  const [confirmingFactorId, setConfirmingFactorId] = useState<string | null>(
    null,
  );

  async function remove(factorId: string, confirmationCode: string) {
    const result = await onRemoveFactor(factorId, confirmationCode);
    if (result.ok) {
      setConfirmingFactorId(null);
    }
    return result;
  }

  return (
    <ul className="divide-y rounded-lg border bg-muted/30">
      {factors.map((factor) => {
        const addedOn = formatSecurityDate(factor.createdAt);
        const isRemoving = removingFactorId === factor.id;
        const isConfirming = confirmingFactorId === factor.id;
        const factorName = factor.issuer ?? "Authenticator app";
        return (
          <li className="grid gap-3 px-3 py-2.5 text-sm" key={factor.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <HugeiconsIcon
                  className="shrink-0 text-muted-foreground"
                  icon={SmartPhone01Icon}
                  size={16}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{factorName}</p>
                  {addedOn && (
                    <p className="text-muted-foreground text-xs">
                      Added {addedOn}
                    </p>
                  )}
                </div>
              </div>
              <Button
                disabled={isRemoving || isConfirming}
                onClick={() => setConfirmingFactorId(factor.id)}
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
            </div>
            {isConfirming && (
              <SecondFactorConfirm
                confirmLabel="Remove authenticator"
                description={`Signing in will no longer ask for a code from ${factorName}. Confirm with a code from your authenticator app or an unused backup code.`}
                destructive
                onCancel={() => setConfirmingFactorId(null)}
                onConfirm={(code) => remove(factor.id, code)}
                title="Turn off two-factor authentication?"
              />
            )}
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
  isStartingEnrollment,
  removingFactorId,
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

  const body: ReactNode = isEnabled ? (
    <FactorList
      factors={factors}
      onRemoveFactor={onRemoveFactor}
      removingFactorId={removingFactorId}
    />
  ) : null;

  const action = isEnabled ? null : (
    <Button
      className="rounded-xl"
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

  const bodyKey = isEnabled ? "factors" : "empty";

  return (
    <div className="divide-y">
      <ResponsiveDialog
        onOpenChange={(open) => {
          if (!open) {
            onCancelEnrollment();
          }
        }}
        open={enrollment !== null}
      >
        <ResponsiveDialogContent className="dialog-stacked sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              Set up two-factor authentication
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Adds a code check whenever you sign in with your password.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {enrollment && (
            <TotpEnrollmentPanel
              accountLabel={accountLabel}
              onCancel={onCancelEnrollment}
              onDone={onEnrollmentDone}
              onSubmit={onVerifyEnrollment}
              otpauthUri={enrollment.otpauthUri}
              qrCode={enrollment.qrCode}
              secret={enrollment.secret}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
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
      {isEnabled && (
        <BackupCodesRow
          accountLabel={accountLabel}
          onRegenerate={onRegenerateBackupCodes}
          remaining={backupCodesRemaining}
        />
      )}
    </div>
  );
}
