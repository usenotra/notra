"use client";

import { FingerPrintIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";

import type { AuthPasskeyButtonProps } from "../../../lib/auth-types";
import { Badge } from "../../ui/badge";
import { CtaButton } from "../cta-button";

export function AuthPasskeyButton({
  onClick,
  disabled = false,
  loading = false,
  lastUsed = false,
  label = "Continue with a passkey",
}: AuthPasskeyButtonProps) {
  return (
    <div className="relative">
      {lastUsed && (
        <Badge className="-top-4 -right-2 absolute z-10" variant="default">
          Last Used
        </Badge>
      )}
      <CtaButton
        className="w-full"
        disabled={disabled}
        onClick={onClick}
        type="button"
        variant="light"
      >
        {loading ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <HugeiconsIcon className="size-4" icon={FingerPrintIcon} />
        )}
        {label}
      </CtaButton>
    </div>
  );
}
