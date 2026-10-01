"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/button";
import type { GuidelinesActionButtonProps } from "@/types/brand-identity";

export function GuidelinesActionButton({
  busy,
  busyLabel,
  icon,
  label,
  onClick,
}: GuidelinesActionButtonProps) {
  return (
    <Button disabled={busy} onClick={onClick}>
      {busy ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <HugeiconsIcon className="size-4" icon={icon} />
      )}
      {busy ? busyLabel : label}
    </Button>
  );
}
