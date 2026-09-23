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
} from "@notra/ui/types/security";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";
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
      toast.error(
        errorMessageOr(
          result?.error?.message,
          "Couldn't start two-factor setup"
        )
      );
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
    setRemovingFactorId(null);
    if (!result) {
      return { ok: false, message: "Couldn't remove the authenticator app" };
    }
    if (result.error) {
      return { ok: false, message: result.error.message };
    }
    toast.success("Two-factor authentication turned off");
    await onRefresh();
    return { ok: true };
  }

  async function verifyEnrollment({
    code,
  }: TotpEnrollmentSubmission): Promise<TotpVerifyResult> {
    if (!enrollment) {
      return { ok: false, message: "Start the setup again." };
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
      toast.success("Two-factor authentication is on");
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

  return (
    <TitleCard heading="Two-factor authentication">
      <div className="space-y-4">
        <TwoFactorSettings
          accountLabel={accountLabel}
          backupCodesRemaining={backupCodesRemaining}
          enrollment={enrollment}
          factors={factors}
          isStartingEnrollment={isStartingEnrollment}
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
