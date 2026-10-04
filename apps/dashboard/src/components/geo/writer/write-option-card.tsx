"use client";

import { Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@notra/ui/components/ui/badge";
import { cn } from "@notra/ui/lib/utils";

import type { WriteOptionCardProps } from "@/types/components/geo-writer";

function SelectionBox({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-muted-foreground/30 group-hover:border-muted-foreground/50"
      )}
    >
      {selected && (
        <HugeiconsIcon className="size-3" icon={Tick01Icon} strokeWidth={3} />
      )}
    </div>
  );
}

export function WriteOptionCard({
  icon,
  label,
  description,
  selected,
  onToggle,
  compact = false,
  badge = null,
  disabled = false,
}: WriteOptionCardProps) {
  const shellClassName = cn(
    "group bg-card relative flex cursor-pointer rounded-lg border text-left transition-colors",
    "hover:border-foreground/20",
    "disabled:hover:border-border disabled:cursor-not-allowed disabled:opacity-50",
    selected ? "border-foreground/40 bg-foreground/[0.02]" : "border-border",
    compact ? "items-center gap-2.5 px-3 py-2" : "flex-col gap-3 p-4"
  );

  if (compact) {
    return (
      <button
        aria-pressed={selected}
        className={shellClassName}
        disabled={disabled}
        onClick={onToggle}
        type="button"
      >
        {icon}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm leading-tight font-medium">
            <span className="truncate">{label}</span>
            {badge ? (
              <Badge className="shrink-0 font-normal" variant="secondary">
                {badge}
              </Badge>
            ) : null}
          </p>
          {description ? (
            <p className="text-muted-foreground truncate text-xs">
              {description}
            </p>
          ) : null}
        </div>
        <SelectionBox selected={selected} />
      </button>
    );
  }

  return (
    <button
      aria-pressed={selected}
      className={shellClassName}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-start justify-between">
        {icon}
        <SelectionBox selected={selected} />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{label}</span>
          {badge ? (
            <Badge className="shrink-0 font-normal" variant="secondary">
              {badge}
            </Badge>
          ) : null}
        </p>
        {description ? (
          <p className="text-muted-foreground truncate text-xs leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
    </button>
  );
}
