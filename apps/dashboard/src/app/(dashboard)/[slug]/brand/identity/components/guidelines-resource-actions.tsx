"use client";

import {
  Copy01Icon,
  Edit02Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { Button, buttonVariants } from "@/components/button";
import { cn } from "@/lib/utils";
import type { GuidelinesResourceActionsProps } from "@/types/brand-identity";
import { copyToClipboard } from "@/utils/copy-to-clipboard";

export function GuidelinesResourceActions({
  url,
  label,
  onEdit,
}: GuidelinesResourceActionsProps) {
  const t = useTranslations("brand.guidelines.resourceActions");
  const tCommon = useTranslations("common");
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {onEdit ? (
        <Button
          aria-label={tCommon("labels.editLabel", { label })}
          onClick={onEdit}
          size="icon-sm"
          variant="ghost"
        >
          <HugeiconsIcon className="size-3.5" icon={Edit02Icon} />
        </Button>
      ) : null}
      <a
        aria-label={t("open", { label })}
        className={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }))}
        href={url}
        rel="noopener noreferrer"
        target="_blank"
      >
        <HugeiconsIcon className="size-3.5" icon={LinkSquare02Icon} />
      </a>
      <Button
        aria-label={t("copyUrl", { label })}
        onClick={() => copyToClipboard(url)}
        size="icon-sm"
        variant="ghost"
      >
        <HugeiconsIcon className="size-3.5" icon={Copy01Icon} />
      </Button>
    </div>
  );
}
