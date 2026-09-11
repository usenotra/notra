"use client";

import { PasskeysSettings } from "@notra/ui/components/shared/security/passkeys-settings";
import { TitleCard } from "@notra/ui/components/ui/title-card";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { SecurityStepUpDialog } from "@/components/settings/security-step-up-dialog";
import { SECURITY_ERROR_CODES } from "@/constants/security";
import { authClient } from "@/lib/auth/client";
import {
  createPasskeyCredential,
  isPasskeySupported,
} from "@/lib/auth/webauthn-client";
import type {
  PasskeysSectionProps,
  PendingStepUp,
} from "@/types/settings/security";

const UNAVAILABLE_MESSAGE =
  "Passkeys aren't available for this account yet. Make sure passkeys are enabled for your WorkOS environment.";

const noop = () => {
  return;
};
const subscribeToNothing = () => noop;
const assumeSupported = () => true;

export function PasskeysSection({
  email,
  passkeys,
  passkeysAvailable,
  status,
  onRefresh,
}: PasskeysSectionProps) {
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    isPasskeySupported,
    assumeSupported
  );
  const [pendingStepUp, setPendingStepUp] = useState<PendingStepUp | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [removingPasskeyId, setRemovingPasskeyId] = useState<string | null>(
    null
  );

  async function addPasskey() {
    setIsAdding(true);
    try {
      const start = await authClient.security.startPasskeyRegistration();
      if (start.error) {
        if (
          start.error.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED
        ) {
          setPendingStepUp({ resume: addPasskey });
          return;
        }
        toast.error(start.error.message);
        return;
      }

      const created = await createPasskeyCredential(start.data.options);
      if (!created.ok) {
        if (!created.cancelled) {
          toast.error(created.message);
        }
        return;
      }

      const completed = await authClient.security.completePasskeyRegistration({
        challengeId: start.data.challengeId,
        response: created.response,
      });
      if (completed.error) {
        if (
          completed.error.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED
        ) {
          setPendingStepUp({ resume: addPasskey });
          return;
        }
        toast.error(completed.error.message);
        return;
      }

      toast.success("Passkey added");
      await onRefresh();
    } catch {
      toast.error("Couldn't add the passkey. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  async function removePasskey(passkeyId: string) {
    setRemovingPasskeyId(passkeyId);
    try {
      const result = await authClient.security.removePasskey({ passkeyId });
      if (result.error) {
        if (
          result.error.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED
        ) {
          setPendingStepUp({ resume: () => removePasskey(passkeyId) });
          return;
        }
        toast.error(result.error.message);
        return;
      }
      toast.success("Passkey removed");
      await onRefresh();
    } catch {
      toast.error("Couldn't remove the passkey. Please try again.");
    } finally {
      setRemovingPasskeyId(null);
    }
  }

  function handleVerified() {
    const resume = pendingStepUp?.resume;
    setPendingStepUp(null);
    resume?.();
  }

  return (
    <TitleCard heading="Passkeys">
      <div className="space-y-4">
        <PasskeysSettings
          isAdding={isAdding}
          isSupported={isSupported}
          onAddPasskey={addPasskey}
          onRemovePasskey={removePasskey}
          onRetry={() => onRefresh()}
          passkeys={passkeys}
          removingPasskeyId={removingPasskeyId}
          status={status}
          unavailableMessage={passkeysAvailable ? null : UNAVAILABLE_MESSAGE}
        />
      </div>
      <SecurityStepUpDialog
        email={email}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStepUp(null);
          }
        }}
        onVerified={handleVerified}
        open={pendingStepUp !== null}
      />
    </TitleCard>
  );
}
