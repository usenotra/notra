"use client";

import { Add01Icon, ArrowReloadHorizontalIcon, Delete02Icon, SmartPhone01Icon, SquareLockPasswordIcon, TwoFactorAccessIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { DEFAULT_TWO_FACTOR_SETTINGS_LABELS } from "@notra/ui/constants/security-labels";
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
import { useUiLabels } from "../ui-labels-provider";
import { StepTransition } from "./step-transition";
import { formatSecurityDate } from "./format-security-date";
import { SecurityLoadError } from "./security-load-error";
import { SecurityMethodRow } from "./security-method-row";

function BackupCodesRow({
  remaining,
  accountLabel,
  labels,
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

  let description = labels.backupCodesDescription;
  if (typeof remaining === "number" && remaining > 0) {
    description = labels.backupCodesRemaining(remaining);
  } else if (remaining === 0) {
    description = labels.backupCodesExhausted;
  }

  let body: ReactNode = null;
  let bodyKey = "empty";
  if (codes) {
    bodyKey = "codes";
    body = (
      <BackupCodesPanel
        accountLabel={accountLabel}
        codes={codes}
        labels={labels.backupCodesPanel}
        onDone={() => setCodes(null)}
      />
    );
  } else if (isConfirming) {
    bodyKey = "confirm";
    body = (
      <SecondFactorConfirm
        confirmLabel={labels.regenerateConfirm}
        description={labels.regenerateDescription}
        labels={labels.secondFactorConfirm}
        onCancel={() => setIsConfirming(false)}
        onConfirm={regenerate}
        title={labels.regenerateTitle}
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
            {labels.regenerate}
          </Button>
        )
      }
      description={description}
      icon={SquareLockPasswordIcon}
      title={labels.backupCodesTitle}
    >
      {body && <StepTransition stepKey={bodyKey}>{body}</StepTransition>}
    </SecurityMethodRow>
  );
}

function FactorList({
  factors,
  removingFactorId,
  labels,
  locale,
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
        const addedOn = formatSecurityDate(factor.createdAt, locale);
        const isRemoving = removingFactorId === factor.id;
        const isConfirming = confirmingFactorId === factor.id;
        const factorName = factor.issuer ?? labels.defaultFactorName;
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
                      {labels.addedOn(addedOn)}
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
                {labels.remove}
              </Button>
            </div>
            {isConfirming && (
              <SecondFactorConfirm
                confirmLabel={labels.removeConfirm}
                description={labels.removeDescription(factorName)}
                destructive
                labels={labels.secondFactorConfirm}
                onCancel={() => setConfirmingFactorId(null)}
                onConfirm={(code) => remove(factor.id, code)}
                title={labels.removeTitle}
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
  labels,
  locale,
}: TwoFactorSettingsProps) {
  const uiLabels = useUiLabels();
  const l = { ...DEFAULT_TWO_FACTOR_SETTINGS_LABELS, ...labels };
  if (status === "loading") {
    return <Skeleton className="h-[4.5rem] rounded-lg" />;
  }

  if (status === "error") {
    return (
      <SecurityLoadError
        message={l.loadError}
        onRetry={onRetry}
        retryLabel={l.retry}
      />
    );
  }

  const isEnabled = factors.length > 0;

  const body: ReactNode = isEnabled ? (
    <FactorList
      factors={factors}
      labels={l}
      locale={locale ?? uiLabels.locale}
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
      {l.setUp}
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
            <ResponsiveDialogTitle>{l.dialogTitle}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {l.dialogDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {enrollment && (
            <TotpEnrollmentPanel
              accountLabel={accountLabel}
              labels={{
                backupCodesPanel: l.backupCodesPanel,
                ...l.enrollmentPanel,
              }}
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
          isEnabled ? l.enabledDescription : l.disabledDescription
        }
        icon={TwoFactorAccessIcon}
        title={
          <span className="flex items-center gap-2">
            {l.title}
            {isEnabled && <Badge variant="success">{l.enabled}</Badge>}
          </span>
        }
      >
        {body && <StepTransition stepKey={bodyKey}>{body}</StepTransition>}
      </SecurityMethodRow>
      {isEnabled && (
        <BackupCodesRow
          accountLabel={accountLabel}
          labels={l}
          onRegenerate={onRegenerateBackupCodes}
          remaining={backupCodesRemaining}
        />
      )}
    </div>
  );
}
