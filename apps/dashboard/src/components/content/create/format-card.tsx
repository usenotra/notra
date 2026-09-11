"use client";

import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { OnDemandContentType } from "@notra/schemas/dashboard/content";
import { cn } from "@notra/ui/lib/utils";

import { FORMAT_CARD_META } from "@/constants/content-formats";
import { OutputTypeIcon } from "@/utils/output-types";

interface FormatCardProps {
  format: OnDemandContentType;
  selected: boolean;
  onToggle: () => void;
}

export function FormatCard({ format, selected, onToggle }: FormatCardProps) {
  const meta = FORMAT_CARD_META[format];

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "group bg-card relative flex cursor-pointer flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
        "hover:border-foreground/20",
        selected ? "border-foreground/40 bg-foreground/[0.02]" : "border-border"
      )}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-start justify-between">
        <OutputTypeIcon
          className={cn("size-5", meta.iconClass)}
          outputType={format}
        />
        <div
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
            selected
              ? "border-foreground bg-foreground text-background"
              : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
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
        <p className="text-sm font-medium">{meta.label}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {meta.description}
        </p>
      </div>
    </button>
  );
}
