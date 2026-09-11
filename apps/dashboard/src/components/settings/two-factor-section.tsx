"use client";

import { TwoFactorSettings } from "@notra/ui/components/shared/security/two-factor-settings";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import type { TotpVerifyResult } from "@notra/ui/lib/auth-types";
import type { BackupCodesOutcome } from "@notra/ui/lib/security-types";
import { useMutation } from "@tanstack/react-query";
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
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  // Only an unverified enrollment must be cleaned up when the pane unmounts;
  // a verified one stays mounted briefly to show the backup codes.
  const abandonedEnrollmentRef = useRef<ActiveTotpEnrollment | null>(null);
  abandonedEnrollmentRef.current =
    enrollment && enrollment.factorId !== verifiedFactorId ? enrollment : null;

  useEffect(() => {
    return () => {
      const abandoned = abandonedEnrollmentRef.current;
      if (abandoned) {
        authClient.security
          .removeAuthFactor({ factorId: abandoned.factorId })
          .catch(() => undefined);
      }
    };
  }, []);

  // react-doctor-disable-next-line query-mutation-missing-invalidation
  const startMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.security.startTotpEnrollment();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data) => {
      setVerifiedFactorId(null);
      setEnrollment(data);
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(error.message, "Couldn't start two-factor setup")
      );
    },
  });

  // react-doctor-disable-next-line query-mutation-missing-invalidation
  const removeMutation = useMutation({
    mutationFn: async (factorId: string) => {
      const result = await authClient.security.removeAuthFactor({ factorId });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: async () => {
      toast.success("Two-factor authentication turned off");
      await onRefresh();
    },
    onError: (error) => {
      toast.error(
        errorMessageOr(error.message, "Couldn't remove the authenticator app")
      );
    },
  });

  async function verifyEnrollment(code: string): Promise<TotpVerifyResult> {
    if (!enrollment) {
      return { ok: false, message: "Start the setup again." };
    }

    const result = await authClient.security.verifyTotpEnrollment({
      authenticationChallengeId: enrollment.authenticationChallengeId,
      code,
    });

    if (result.error) {
      return { ok: false, message: result.error.message };
    }

    setVerifiedFactorId(enrollment.factorId);
    toast.success("Two-factor authentication is on");
    return { ok: true, backupCodes: result.data.backupCodes };
  }

  async function finishEnrollment() {
    setEnrollment(null);
    await onRefresh();
  }

  function cancelEnrollment() {
    const current = enrollment;
    setEnrollment(null);
    if (current && current.factorId !== verifiedFactorId) {
      authClient.security
        .removeAuthFactor({ factorId: current.factorId })
        .catch(() => undefined);
    }
  }

  async function regenerateBackupCodes(): Promise<BackupCodesOutcome> {
    const result = await authClient.security.regenerateBackupCodes();
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
          isStartingEnrollment={startMutation.isPending}
          onCancelEnrollment={cancelEnrollment}
          onEnrollmentDone={finishEnrollment}
          onRegenerateBackupCodes={regenerateBackupCodes}
          onRemoveFactor={(factorId) => removeMutation.mutate(factorId)}
          onRetry={() => onRefresh()}
          onStartEnrollment={() => startMutation.mutate()}
          onVerifyEnrollment={verifyEnrollment}
          removingFactorId={
            removeMutation.isPending ? removeMutation.variables : null
          }
          status={status}
        />
      </div>
    </TitleCard>
  );
}
