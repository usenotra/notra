"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/button";
import type { AddRepositoryButtonProps } from "@/types/integrations";

export function AddRepositoryButton({
  onAdd,
  label,
}: AddRepositoryButtonProps) {
  const tCommon = useTranslations("common");

  return (
    <Button
      className="h-6 shrink-0 gap-1 rounded px-2 text-xs"
      onClick={() => onAdd?.()}
      size="sm"
      type="button"
    >
      <HugeiconsIcon className="size-3" icon={Add01Icon} />
      {label ?? tCommon("actions.add")}
    </Button>
  );
}
