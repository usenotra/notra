"use client";

import {
  GEO_SCAN_CUSTOM_INTERVAL_VALUE,
  GEO_SCAN_DEFAULT_INTERVAL_HOURS,
  GEO_SCAN_HOURS_PER_DAY,
  GEO_SCAN_INTERVAL_OPTIONS,
  GEO_SCAN_MAX_INTERVAL_DAYS,
  GEO_SCAN_MIN_INTERVAL_DAYS,
} from "@notra/geo-core/constants/geo";
import {
  geoScanIntervalDays,
  isGeoScanIntervalPreset,
} from "@notra/geo-core/utils/geo-scan";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import { Switch } from "@notra/ui/components/ui/switch";
import { cn } from "@notra/ui/lib/utils";
import { useState } from "react";
import { useTranslations } from "use-intl";

import { useGeoScanIntervalNoun } from "@/lib/hooks/use-geo-scan-interval-noun";
import type {
  GeoScanFrequencySelectProps,
  GeoScanScheduleProps,
} from "@/types/geo";
import { geoScanIntervalMessageKey } from "@/utils/geo-scan-interval-key";

function parseIntervalDays(raw: string): number | null {
  const days = Number(raw);
  if (
    raw.trim() === "" ||
    !Number.isInteger(days) ||
    days < GEO_SCAN_MIN_INTERVAL_DAYS ||
    days > GEO_SCAN_MAX_INTERVAL_DAYS
  ) {
    return null;
  }
  return days;
}

export function GeoScanFrequencySelect({
  id,
  intervalHours,
  onIntervalChange,
  disabled = false,
}: GeoScanFrequencySelectProps) {
  const t = useTranslations("geo.geoScanSchedule");
  const tCommon = useTranslations("common");
  const intervalNoun = useGeoScanIntervalNoun();
  const shortOptionLabel = (hours: number): string => {
    const key = geoScanIntervalMessageKey(hours);
    if (key === "24") {
      return tCommon("labels.daily");
    }
    if (key === "168") {
      return tCommon("labels.weekly");
    }
    return key ? t(`short.${key}`) : intervalNoun(hours);
  };
  const intervalShortLabel = (value: string): string => {
    if (value === GEO_SCAN_CUSTOM_INTERVAL_VALUE) {
      return tCommon("labels.custom");
    }
    return shortOptionLabel(intervalHours);
  };
  const triggerId = `${id}-frequency`;
  const daysId = `${id}-interval-days`;
  const [isCustom, setIsCustom] = useState(
    () => !isGeoScanIntervalPreset(intervalHours)
  );
  const [daysDraft, setDaysDraft] = useState(() =>
    String(geoScanIntervalDays(intervalHours))
  );
  const selectValue = isCustom
    ? GEO_SCAN_CUSTOM_INTERVAL_VALUE
    : String(intervalHours);
  const daysInvalid = parseIntervalDays(daysDraft) === null;
  const isPlural = parseIntervalDays(daysDraft) !== 1;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Label className="text-muted-foreground font-normal" htmlFor={triggerId}>
        {t("setFrequency")}
      </Label>
      <Select
        disabled={disabled}
        onValueChange={(value: string | null) => {
          if (value === null) {
            return;
          }
          if (value === GEO_SCAN_CUSTOM_INTERVAL_VALUE) {
            setIsCustom(true);
            setDaysDraft(String(geoScanIntervalDays(intervalHours)));
            return;
          }
          setIsCustom(false);
          onIntervalChange(Number(value));
        }}
        value={selectValue}
      >
        <SelectTrigger aria-label={t("frequency")} id={triggerId} size="sm">
          <SelectValue>
            {(value: string) => intervalShortLabel(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {GEO_SCAN_INTERVAL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              <span className="flex items-baseline gap-2">
                {shortOptionLabel(option.value)}
                {option.value === GEO_SCAN_DEFAULT_INTERVAL_HOURS ? (
                  <span className="text-muted-foreground text-xs">
                    {t("default")}
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
          <SelectItem value={GEO_SCAN_CUSTOM_INTERVAL_VALUE}>
            {t("customOption")}
          </SelectItem>
        </SelectContent>
      </Select>
      {isCustom ? (
        <div className="flex items-center gap-1.5">
          <Label className="sr-only" htmlFor={daysId}>
            {t("daysBetween")}
          </Label>
          <span className="text-muted-foreground text-sm">{t("every")}</span>
          <Input
            aria-invalid={daysInvalid || undefined}
            className="h-8 w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            disabled={disabled}
            id={daysId}
            inputMode="numeric"
            max={GEO_SCAN_MAX_INTERVAL_DAYS}
            min={GEO_SCAN_MIN_INTERVAL_DAYS}
            onChange={(event) => {
              const next = event.target.value;
              setDaysDraft(next);
              const days = parseIntervalDays(next);
              if (days !== null) {
                onIntervalChange(days * GEO_SCAN_HOURS_PER_DAY);
              }
            }}
            step={1}
            type="number"
            value={daysDraft}
          />
          <span className="text-muted-foreground text-sm">
            <span aria-hidden="true">
              {t("dayUnit")}
              <span
                className={cn(
                  "inline-grid overflow-hidden transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
                  isPlural ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
                )}
              >
                <span className="overflow-hidden">{t("dayPluralSuffix")}</span>
              </span>
            </span>
            <span className="sr-only">
              {t("daysSr", { count: isPlural ? 2 : 1 })}
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function GeoScanSchedule({
  id,
  enabled,
  onEnabledChange,
  intervalHours,
}: GeoScanScheduleProps) {
  const t = useTranslations("geo.geoScanSchedule");
  const intervalNoun = useGeoScanIntervalNoun();
  const summary = enabled
    ? t.rich("summaryEnabled", {
        interval: intervalNoun(intervalHours),
        strong: (chunks) => (
          <strong className="text-foreground font-semibold">{chunks}</strong>
        ),
      })
    : t("summaryPaused");

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="space-y-0.5">
        <Label htmlFor={`${id}-enabled`}>{t("automaticScans")}</Label>
        <p className="text-muted-foreground text-xs">{summary}</p>
      </div>
      <Switch
        checked={enabled}
        id={`${id}-enabled`}
        onCheckedChange={onEnabledChange}
      />
    </div>
  );
}
