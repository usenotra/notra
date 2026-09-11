"use client";

import { StepUpVerification } from "@notra/ui/components/shared/security/step-up-verification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@notra/ui/components/ui/dialog";
import type { SecurityActionOutcome } from "@notra/ui/lib/security-types";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import type { SecurityStepUpDialogProps } from "@/types/settings/security";

function StepUpDialogBody({
  email,
  onCancel,
  onVerified,
}: {
  email: string;
  onCancel: () => void;
  onVerified: () => void;
}) {
  const [challengeId, setChallengeId] = useState<string | null>(null);

  async function sendCode(): Promise<SecurityActionOutcome> {
    const result = await authClient.security.sendChallenge();
    if (result.error) {
      return { ok: false, message: result.error.message };
    }
    setChallengeId(result.data.authenticationChallengeId);
    return { ok: true };
  }

  async function verify(code: string): Promise<SecurityActionOutcome> {
    if (!challengeId) {
      return { ok: false, message: "Request a new code first." };
    }
    const result = await authClient.security.verifyChallenge({
      authenticationChallengeId: challengeId,
      code,
    });
    if (result.error) {
      return { ok: false, message: result.error.message };
    }
    onVerified();
    return { ok: true };
  }

  return (
    <StepUpVerification
      email={email}
      onCancel={onCancel}
      onSendCode={sendCode}
      onVerify={verify}
    />
  );
}

export function SecurityStepUpDialog({
  email,
  open,
  onOpenChange,
  onVerified,
}: SecurityStepUpDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm it&apos;s you</DialogTitle>
          <DialogDescription>
            Enter the code we just emailed you to manage passkeys.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <StepUpDialogBody
            email={email}
            onCancel={() => onOpenChange(false)}
            onVerified={onVerified}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
