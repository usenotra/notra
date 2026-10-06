"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "use-intl";

import { SITE_ENVIRONMENT_ICONS } from "@/constants/sites";
import { cn } from "@/lib/utils";
import type { SiteEnvironmentBadgeProps } from "@/types/components/sites";

export function SiteEnvironmentBadge({
  kind,
  previewKey,
  live,
  className,
}: SiteEnvironmentBadgeProps) {
  const t = useTranslations("sites.kinds");
  const current = kind === "production" && live;
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        current
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground border",
        className
      )}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className="size-3.5 shrink-0"
        icon={SITE_ENVIRONMENT_ICONS[kind]}
        strokeWidth={2}
      />
      <span className="truncate">{previewKey ?? t(kind)}</span>
    </span>
  );
}
