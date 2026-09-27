"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@notra/ui/components/ui/collapsible";
import { useTranslations } from "next-intl";

import { markdownToElements } from "@/utils/inline-markdown";

interface RecommendationsSectionProps {
  value: string | null;
}

export function RecommendationsSection({ value }: RecommendationsSectionProps) {
  const t = useTranslations("content.detail");
  if (!value?.trim()) {
    return null;
  }

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors [&[data-panel-open]>svg]:rotate-0">
        <HugeiconsIcon
          className="-rotate-90 transition-transform"
          icon={ArrowDown01Icon}
          size={14}
        />
        {t("recommendations")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none pt-2">
          {markdownToElements(value)}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
