"use client";

import { ArrowUpDownIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_FILTER_TRIGGER_CLASS,
  GEO_MENTION_TREND_AGENT_ICON_LIMIT,
  GEO_MENTION_TREND_ALL_PROVIDERS_LABEL,
} from "@notra/geo-core/constants/geo";
import { engineFamilyOf } from "@notra/geo-core/utils/geo-engine-family";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";

import { EngineIcon } from "@/components/geo/engine-icon";
import { cn } from "@/lib/utils";
import type { MentionTrendAgentsPickerProps } from "@/types/geo";

export function MentionTrendAgentsPicker({
  series,
  activeKeys,
  onToggle,
  disabled = false,
}: MentionTrendAgentsPickerProps) {
  const seenProviders = new Set<string>();
  const preview = series
    .filter((entry) => {
      const provider = engineFamilyOf(entry.engine);
      if (seenProviders.has(provider)) {
        return false;
      }
      seenProviders.add(provider);
      return true;
    })
    .slice(0, GEO_MENTION_TREND_AGENT_ICON_LIMIT);
  const active = series.filter((entry) => activeKeys.has(entry.key));
  const accessibleLabel = `Mention activity for all providers. ${
    active.length === 0
      ? "No individual lines shown"
      : `Individual lines shown for ${active.map((entry) => entry.label).join(", ")}`
  }`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={accessibleLabel}
        className={cn(
          GEO_FILTER_TRIGGER_CLASS,
          disabled && "pointer-events-none opacity-50"
        )}
        disabled={disabled}
      >
        {preview.length > 0 ? (
          <span className="flex -space-x-1 pr-1">
            {preview.map((entry) => (
              <span
                className="bg-background flex size-5 shrink-0 items-center justify-center rounded-full"
                key={entry.key}
              >
                <EngineIcon className="size-4" engine={entry.engine} />
              </span>
            ))}
          </span>
        ) : null}
        <span>{GEO_MENTION_TREND_ALL_PROVIDERS_LABEL}</span>
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={ArrowUpDownIcon}
          size={12}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show by provider</DropdownMenuLabel>
          {series.map((entry) => (
            <DropdownMenuCheckboxItem
              checked={activeKeys.has(entry.key)}
              key={entry.key}
              onCheckedChange={() => onToggle(entry.key)}
            >
              <EngineIcon className="size-3.5" engine={entry.engine} />
              {entry.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
