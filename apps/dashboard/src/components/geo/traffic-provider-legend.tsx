"use client";

import { ArrowUpDownIcon, Robot01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_FILTER_TRIGGER_CLASS } from "@notra/geo-core/constants/geo";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import type { TrafficProviderLegendProps } from "@/types/geo";

export function TrafficProviderLegend({
  series,
  hiddenKeys,
  onToggle,
}: TrafficProviderLegendProps) {
  const t = useTranslations("geo.trafficProviderLegend");
  const visibleCount = series.filter(
    (entry) => !hiddenKeys.has(entry.key)
  ).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("ariaLabel", {
          visible: visibleCount,
          total: series.length,
        })}
        className={GEO_FILTER_TRIGGER_CLASS}
      >
        <span>
          {visibleCount === series.length
            ? t("providers")
            : t("providersFiltered", {
                visible: visibleCount,
                total: series.length,
              })}
        </span>
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={ArrowUpDownIcon}
          size={12}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-56 overflow-y-auto"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("showTrafficFrom")}</DropdownMenuLabel>
          {series.map((entry) => (
            <DropdownMenuCheckboxItem
              checked={!hiddenKeys.has(entry.key)}
              key={entry.key}
              onCheckedChange={() => onToggle(entry.key)}
            >
              {entry.icon === null ? (
                <HugeiconsIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0"
                  icon={Robot01Icon}
                />
              ) : (
                <EngineIcon className="size-3.5 shrink-0" engine={entry.icon} />
              )}
              {entry.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
