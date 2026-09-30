"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "next-intl";

import { AI_TRAFFIC_PURPOSE_LABEL_KEYS } from "@/constants/ai-traffic-purposes";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import type { PurposeBadgeProps } from "@/types/geo";
import { aiTrafficPurposeKey } from "@/utils/geo-traffic-purpose";

export function PurposeBadge({
  category,
  compact = false,
  tooltip = true,
}: PurposeBadgeProps) {
  const t = useTranslations("geo.purposeBadge");
  const tGeoShared = useTranslations("geo.shared");
  const icon = AI_TRAFFIC_PURPOSE_ICONS[category];
  const purpose = aiTrafficPurposeKey(category);
  const label = purpose
    ? tGeoShared(AI_TRAFFIC_PURPOSE_LABEL_KEYS[purpose])
    : category;
  const description = purpose ? t(`description.${purpose}`) : category;

  const badge = (
    <Badge
      aria-label={compact ? label : undefined}
      className={compact ? "px-1.5" : "gap-1 font-normal"}
      variant="secondary"
    >
      {icon ? (
        <HugeiconsIcon
          className="size-3 shrink-0"
          icon={icon}
          strokeWidth={2}
        />
      ) : null}
      {compact ? null : label}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex max-w-full cursor-help" />}
      >
        {badge}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">
        {compact ? <span className="block font-medium">{label}</span> : null}
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
