"use client";

import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "use-intl";

import { EVENT_TYPE_META } from "@/constants/event-triggers";
import type { EventTypeCardProps } from "@/types/automation/event-trigger";

export function EventTypeCard({
  eventType,
  selected,
  onSelect,
}: EventTypeCardProps) {
  const t = useTranslations("automation.events.eventTypes");
  const tLabels = useTranslations("common.labels");
  const meta = EVENT_TYPE_META[eventType];

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group bg-card relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
        "hover:border-foreground/30",
        selected ? "border-foreground bg-muted/50" : "border-border"
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between">
        <HugeiconsIcon
          className={cn("size-5", meta.iconClass)}
          icon={meta.icon}
        />
        <div
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
            selected
              ? "bg-foreground text-background"
              : "border-muted-foreground/30 group-hover:border-muted-foreground/50 border"
          )}
        >
          {selected && (
            <HugeiconsIcon
              className="size-3"
              icon={Tick01Icon}
              strokeWidth={3}
            />
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {eventType === "release"
            ? tLabels("releasePublished")
            : t(`${eventType}.label`)}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {t(`${eventType}.description`)}
        </p>
      </div>
    </button>
  );
}
