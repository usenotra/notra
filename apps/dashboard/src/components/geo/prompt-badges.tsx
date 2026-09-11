"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_PRESENCE_LABELS } from "@notra/geo-core/constants/geo";
import { geoPromptIntentLabel } from "@notra/geo-core/utils/geo-prompt-intent";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";

import {
  GEO_PROMPT_INTENT_ICONS,
  GEO_PROMPT_INTENT_PILL_CLASS,
  GEO_PROMPT_LABEL_PILL_CLASS,
  GEO_PROMPT_PRESENCE_HINTS,
  GEO_PROMPT_PRESENCE_ICONS,
  GEO_PROMPT_PRESENCE_PILL_CLASS,
} from "@/constants/geo-prompts";
import { cn } from "@/lib/utils";
import type {
  PromptIntentBadgeProps,
  PromptPresenceBadgeProps,
} from "@/types/geo";

export function PromptIntentBadge({ intent }: PromptIntentBadgeProps) {
  return (
    <span
      className={cn(
        GEO_PROMPT_LABEL_PILL_CLASS,
        GEO_PROMPT_INTENT_PILL_CLASS[intent]
      )}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3.5 shrink-0"
        icon={GEO_PROMPT_INTENT_ICONS[intent]}
        strokeWidth={2}
      />
      {geoPromptIntentLabel(intent)}
    </span>
  );
}

export function PromptPresenceBadge({ status }: PromptPresenceBadgeProps) {
  if (!status) {
    return <span className="text-muted-foreground">-</span>;
  }
  const label = GEO_PRESENCE_LABELS[status];
  if (!label) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              GEO_PROMPT_LABEL_PILL_CLASS,
              "cursor-help",
              GEO_PROMPT_PRESENCE_PILL_CLASS[status]
            )}
          >
            <HugeiconsIcon
              aria-hidden
              className="size-3.5 shrink-0"
              icon={GEO_PROMPT_PRESENCE_ICONS[status]}
              strokeWidth={2}
            />
            {label}
          </span>
        }
      />
      <TooltipContent className="max-w-xs text-pretty">
        <span className="block font-medium">{label}</span>
        {GEO_PROMPT_PRESENCE_HINTS[status]}
      </TooltipContent>
    </Tooltip>
  );
}
