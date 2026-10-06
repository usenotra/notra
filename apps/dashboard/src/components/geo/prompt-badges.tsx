"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useTranslations } from "use-intl";

import {
  GEO_PROMPT_LABEL_PILL_CLASS,
  GEO_PROMPT_PRESENCE_ICONS,
  GEO_PROMPT_PRESENCE_PILL_CLASS,
} from "@/constants/geo-prompts";
import { cn } from "@/lib/utils";
import type { PromptPresenceBadgeProps } from "@/types/geo";

export function PromptPresenceBadge({ status }: PromptPresenceBadgeProps) {
  const t = useTranslations("geo.promptBadges");
  const tGeoShared = useTranslations("geo.shared");
  if (!status) {
    return <span className="text-muted-foreground">-</span>;
  }
  const label =
    status === "invisible"
      ? tGeoShared("notMentioned")
      : t(`presence.${status}`);
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
        {t(`presenceHint.${status}`)}
      </TooltipContent>
    </Tooltip>
  );
}
