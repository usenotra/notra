"use client";

import { TwoFactorSettings } from "@notra/ui/components/shared/security/two-factor-settings";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import type {
  TotpEnrollmentSubmission,
  TotpVerifyResult,
} from "@notra/ui/types/auth";
import type {
  BackupCodesOutcome,
  SecurityActionOutcome,
  TwoFactorSettingsLabels,
} from "@notra/ui/types/security";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
import {
  useBackupCodesPanelLabels,
  useTotpEnrollmentPanelLabels,
} from "@/lib/i18n/use-auth-labels";
import { errorMessageOr } from "@/lib/utils";
import type {
  ActiveTotpEnrollment,
  TwoFactorSectionProps,
} from "@/types/settings/security";

export function TwoFactorSection({
  accountLabel,
  factors,
  backupCodesRemaining,
  status,
  onRefresh,
}: TwoFactorSectionProps) {
  const t = useTranslations("settings.twoFactor");
  const tSettingsShared = useTranslations("settings.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const enrollmentPanel = useTotpEnrollmentPanelLabels();
  const backupCodesPanel = useBackupCodesPanelLabels();
  const [enrollment, setEnrollment] = useState<ActiveTotpEnrollment | null>(
    null
  );
  const enrollmentRef = useRef(enrollment);
  useEffect(() => {
    enrollmentRef.current = enrollment;
  }, [enrollment]);

  const [isStartingEnrollment, setIsStartingEnrollment] = useState(false);
  const [removingFactorId, setRemovingFactorId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const current = enrollmentRef.current;
      if (current?.kind === "scanning") {
        authClient.security
          .discardTotpEnrollment({ factorId: current.factorId })
          .catch(() => undefined);
      }
    };
  }, []);

  async function startEnrollment() {
    setIsStartingEnrollment(true);
    const result = await authClient.security
      .startTotpEnrollment()
      .catch(() => null);
    setIsStartingEnrollment(false);
    if (!result || result.error) {
      toast.error(errorMessageOr(result?.error?.message, t("startFailed")));
      return;
    }
    setEnrollment({ kind: "scanning", ...result.data });
  }

  async function removeFactor(
    factorId: string,
    confirmationCode: string
  ): Promise<SecurityActionOutcome> {
    setRemovingFactorId(factorId);
    const result = await authClient.security
      .removeAuthFactor({ factorId, confirmationCode })
      .catch(() => null);
    if (!result) {
      setRemovingFactorId(null);
      return { ok: false, message: t("removeFailed") };
    }
    if (result.error) {
      setRemovingFactorId(null);
      return { ok: false, message: result.error.message };
    }
    toast.success(t("turnedOff"));
    await onRefresh();
    setRemovingFactorId(null);
    return { ok: true };
  }

  async function verifyEnrollment({
    code,
  }: TotpEnrollmentSubmission): Promise<TotpVerifyResult> {
    if (!enrollment) {
      return { ok: false, message: t("startAgain") };
    }

    const result = await authClient.security.verifyTotpEnrollment({
      factorId: enrollment.factorId,
      authenticationChallengeId: enrollment.authenticationChallengeId,
      code,
    });

    if (result.error) {
      return { ok: false, message: result.error.message };
    }

    setEnrollment({ ...enrollment, kind: "verified" });
    if (result.data.warning) {
      toast.warning(result.data.warning);
    } else {
      toast.success(t("turnedOn"));
    }
    return { ok: true, backupCodes: result.data.backupCodes ?? undefined };
  }

  async function finishEnrollment() {
    setEnrollment(null);
    await onRefresh();
  }

  function cancelEnrollment() {
    const current = enrollment;
    if (current?.kind === "verified") {
      void finishEnrollment();
      return;
    }
    setEnrollment(null);
    if (current?.kind === "scanning") {
      authClient.security
        .discardTotpEnrollment({ factorId: current.factorId })
        .catch(() => undefined);
    }
  }

  async function regenerateBackupCodes(
    confirmationCode: string
  ): Promise<BackupCodesOutcome> {
    const result = await authClient.security.regenerateBackupCodes({
      confirmationCode,
    });
    if (result.error) {
      return { ok: false, message: result.error.message };
    }
    await onRefresh();
    return { ok: true, codes: result.data.codes };
  }

  const labels: TwoFactorSettingsLabels = {
    loadError: t("settings.loadError"),
    retry: tCommon("actions.tryAgain"),
    title: tSettingsShared("authenticatorApp"),
    enabled: t("settings.enabled"),
    enabledDescription: t("settings.enabledDescription"),
    disabledDescription: t("settings.disabledDescription"),
    setUp: tCommon("labels.setUp"),
    dialogTitle: t("settings.dialogTitle"),
    dialogDescription: t("settings.dialogDescription"),
    defaultFactorName: tSettingsShared("authenticatorApp"),
    addedOn: (date) => t("settings.addedOn", { date }),
    remove: tCommon("actions.remove"),
    removeTitle: t("settings.removeTitle"),
    removeDescription: (factorName) =>
      t("settings.removeDescription", { factorName }),
    removeConfirm: t("settings.removeConfirm"),
    backupCodesTitle: t("settings.backupCodesTitle"),
    backupCodesDescription: t("settings.backupCodesDescription"),
    backupCodesRemaining: (count) =>
      t("settings.backupCodesRemaining", { count }),
    backupCodesExhausted: t("settings.backupCodesExhausted"),
    regenerate: tCommon("labels.regenerate"),
    regenerateTitle: t("settings.regenerateTitle"),
    regenerateDescription: t("settings.regenerateDescription"),
    regenerateConfirm: t("settings.regenerateConfirm"),
    enrollmentPanel,
    backupCodesPanel,
    secondFactorConfirm: {
      codeLabel: t("confirm.codeLabel"),
      codePlaceholder: t("confirm.codePlaceholder"),
      cancel: tCommon("actions.cancel"),
      errorFallback: tSettingsShared("thatCodeDidnTWork"),
    },
  };

  return (
    <TitleCard heading={tCommon("labels.twoFactorAuthentication")}>
      <div className="space-y-4">
        <TwoFactorSettings
          accountLabel={accountLabel}
          backupCodesRemaining={backupCodesRemaining}
          enrollment={enrollment}
          factors={factors}
          isStartingEnrollment={isStartingEnrollment}
          labels={labels}
          locale={locale}
          onCancelEnrollment={cancelEnrollment}
          onEnrollmentDone={finishEnrollment}
          onRegenerateBackupCodes={regenerateBackupCodes}
          onRemoveFactor={removeFactor}
          onRetry={() => onRefresh()}
          onStartEnrollment={startEnrollment}
          onVerifyEnrollment={verifyEnrollment}
          removingFactorId={removingFactorId}
          status={status}
        />
      </div>
    </TitleCard>
  );
}
