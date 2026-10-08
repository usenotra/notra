"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
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
    <Badge
      className={cn("max-w-full", className)}
      variant={current ? "default" : "outline"}
    >
      <HugeiconsIcon
        aria-hidden="true"
        className={current ? undefined : "text-muted-foreground"}
        icon={SITE_ENVIRONMENT_ICONS[kind]}
        strokeWidth={2}
      />
      <span
        className={cn("min-w-0 truncate", !current && "text-muted-foreground")}
      >
        {previewKey ?? t(kind)}
      </span>
    </Badge>
  );
}
