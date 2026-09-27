"use client";

import {
  CursorPointer02Icon,
  Globe02Icon,
  QuotesIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import {
  AI_TRAFFIC_PURPOSE_DESCRIPTIONS,
  AI_TRAFFIC_PURPOSE_LABELS,
} from "@notra/ui/constants/geo";
import type { PurposeBadgeProps } from "@notra/ui/types/geo";

const PURPOSE_ICONS: Record<string, typeof QuotesIcon> = {
  "assistant-browse": QuotesIcon,
  "training-crawler": Globe02Icon,
  "search-index": Search01Icon,
  "assistant-referral": CursorPointer02Icon,
};

export function PurposeBadge({
  category,
  label: labelOverride,
  description: descriptionOverride,
}: PurposeBadgeProps) {
  const icon = PURPOSE_ICONS[category];
  const label =
    labelOverride ?? AI_TRAFFIC_PURPOSE_LABELS[category] ?? category;
  const description =
    descriptionOverride ?? AI_TRAFFIC_PURPOSE_DESCRIPTIONS[category] ?? category;

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex max-w-full cursor-help" />}
      >
        <Badge className="gap-1 font-normal" variant="secondary">
          {icon ? (
            <HugeiconsIcon
              className="size-3 shrink-0"
              icon={icon}
              strokeWidth={2}
            />
          ) : null}
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-pretty">
        {description}
      </TooltipContent>
    </Tooltip>
  );
}
