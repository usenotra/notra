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
import type { ActionResult } from "@/types/organizations/actions";
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

  /**
   * Runs a passkey action; when WorkOS wants a fresh email verification the
   * step-up dialog opens and `resume` re-runs the whole flow afterwards.
   */
  async function withStepUp<T>(
    run: () => Promise<ActionResult<T>>,
    resume: () => void
  ): Promise<T | null> {
    const result = await run();
    if (result.error?.code === SECURITY_ERROR_CODES.ELEVATED_ACCESS_REQUIRED) {
      setPendingStepUp({ resume });
      return null;
    }
    if (result.error) {
      toast.error(result.error.message);
      return null;
    }
    return result.data;
  }

  async function addPasskey() {
    setIsAdding(true);
    try {
      const start = await withStepUp(
        () => authClient.security.startPasskeyRegistration(),
        addPasskey
      );
      if (!start) {
        return;
      }

      const created = await createPasskeyCredential(start.options);
      if (!created.ok) {
        if (!created.cancelled) {
          toast.error(created.message);
        }
        return;
      }

      const completed = await withStepUp(
        () =>
          authClient.security.completePasskeyRegistration({
            challengeId: start.challengeId,
            response: created.response,
          }),
        addPasskey
      );
      if (!completed) {
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
      const removed = await withStepUp(
        () => authClient.security.removePasskey({ passkeyId }),
        () => removePasskey(passkeyId)
      );
      if (!removed) {
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
