"use client";

import {
  Add01Icon,
  Delete02Icon,
  Key01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";
import type { ReactNode } from "react";

import type {
  PasskeySummary,
  PasskeysSettingsProps,
} from "../../../lib/security-types";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { formatSecurityDate } from "./format-security-date";
import { SecurityLoadError } from "./security-load-error";
import { SecurityMethodRow } from "./security-method-row";

const UNSUPPORTED_MESSAGE =
  "Your browser doesn't support passkeys. Try a recent version of Chrome, Safari, Edge, or Firefox.";

function PasskeyList({
  passkeys,
  removingPasskeyId,
  onRemovePasskey,
}: {
  passkeys: PasskeySummary[];
  removingPasskeyId: string | null;
  onRemovePasskey: (passkeyId: string) => void;
}) {
  return (
    <ul className="grid gap-3">
      {passkeys.map((passkey) => {
        const addedOn = formatSecurityDate(passkey.createdAt);
        const lastUsed = formatSecurityDate(passkey.lastUsedAt);
        const isRemoving = removingPasskeyId === passkey.id;
        const meta = [
          addedOn ? `Added ${addedOn}` : null,
          lastUsed ? `Last used ${lastUsed}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li
            className="flex items-center justify-between gap-3 text-sm"
            key={passkey.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <HugeiconsIcon
                className="shrink-0 text-muted-foreground"
                icon={Key01Icon}
                size={18}
              />
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {passkey.name || "Passkey"}
                </p>
                {meta && (
                  <p className="text-muted-foreground text-xs">{meta}</p>
                )}
              </div>
            </div>
            <Button
              disabled={isRemoving}
              onClick={() => onRemovePasskey(passkey.id)}
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

export function PasskeysSettings({
  passkeys,
  status,
  isSupported,
  isAdding = false,
  removingPasskeyId = null,
  unavailableMessage,
  onAddPasskey,
  onRemovePasskey,
  onRetry,
}: PasskeysSettingsProps) {
  if (status === "loading") {
    return <Skeleton className="h-[4.5rem] rounded-lg" />;
  }

  if (status === "error") {
    return (
      <SecurityLoadError
        message="Couldn't load your passkeys."
        onRetry={onRetry}
      />
    );
  }

  const hasPasskeys = passkeys.length > 0;
  const blockedMessage = unavailableMessage ?? (isSupported ? null : UNSUPPORTED_MESSAGE);
  const canAdd = !blockedMessage;

  let body: ReactNode;
  if (blockedMessage) {
    body = <p className="text-muted-foreground text-sm">{blockedMessage}</p>;
  } else if (hasPasskeys) {
    body = (
      <PasskeyList
        onRemovePasskey={onRemovePasskey}
        passkeys={passkeys}
        removingPasskeyId={removingPasskeyId}
      />
    );
  } else {
    body = (
      <p className="text-muted-foreground text-sm">
        No passkeys yet.
      </p>
    );
  }

  return (
    <SecurityMethodRow
      action={
        <Button
          disabled={!canAdd || isAdding}
          onClick={onAddPasskey}
          size="sm"
          type="button"
        >
          {isAdding ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <HugeiconsIcon data-icon="inline-start" icon={Add01Icon} />
          )}
          Add passkey
        </Button>
      }
      description="Face ID, Touch ID, Windows Hello, or a security key."
      icon={Key01Icon}
      title={
        <span className="flex items-center gap-2">
          Passkeys
          {hasPasskeys && <Badge variant="success">On</Badge>}
        </span>
      }
    >
      {body}
    </SecurityMethodRow>
  );
}
