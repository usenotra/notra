"use client";

import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/button";
import type { GuidelinesActionButtonProps } from "@/types/brand-identity";

export function GuidelinesActionButton({
  busy,
  icon,
  label,
  onClick,
}: GuidelinesActionButtonProps) {
  return (
    <Button loading={busy} onClick={onClick}>
      <HugeiconsIcon className="size-4" icon={icon} />
      {label}
    </Button>
  );
}
