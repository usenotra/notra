"use client";

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
  CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
} from "@notra/ai/constants/schedule-interval";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

import type { ScheduleIntervalPickerProps } from "@/types/automation/schedule";

function parseIntervalDays(raw: string): number | undefined {
  const value = Number.parseInt(raw, 10);
  const inRange =
    !Number.isNaN(value) &&
    value >= CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS &&
    value <= CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS;
  return inRange ? value : undefined;
}

export function ScheduleIntervalPicker({
  intervalDays,
  onIntervalDaysChange,
}: ScheduleIntervalPickerProps) {
  const t = useTranslations("automation.schedules.interval");
  const [draft, setDraft] = useState(
    intervalDays === undefined ? "" : String(intervalDays)
  );
  const [syncedDays, setSyncedDays] = useState(intervalDays);
  if (intervalDays !== syncedDays) {
    setSyncedDays(intervalDays);
    if (intervalDays !== undefined) {
      setDraft(String(intervalDays));
    }
  }

  const isInvalid = draft.length > 0 && parseIntervalDays(draft) === undefined;
  const canDecrement =
    intervalDays !== undefined &&
    intervalDays > CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS;
  const canIncrement =
    intervalDays !== undefined &&
    intervalDays < CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS;

  const commit = (days: number) => {
    setDraft(String(days));
    onIntervalDaysChange(days);
  };

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs" htmlFor="interval-days">
        {t("repeatEvery")}
      </Label>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "bg-background inline-flex h-10 items-center rounded-lg border transition-colors",
            isInvalid
              ? "border-destructive ring-destructive/20 ring-[3px]"
              : "border-border focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-2"
          )}
        >
          <button
            aria-label={t("fewer")}
            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40 flex size-10 items-center justify-center rounded-l-lg transition-colors disabled:cursor-not-allowed"
            disabled={!canDecrement}
            onClick={() => {
              if (intervalDays !== undefined) {
                commit(intervalDays - 1);
              }
            }}
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={MinusSignIcon} />
          </button>
          <Input
            aria-invalid={isInvalid || undefined}
            className="h-full w-12 [appearance:textfield] rounded-none border-0 bg-transparent px-0 text-center font-medium tabular-nums shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            id="interval-days"
            inputMode="numeric"
            max={CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS}
            min={CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              onIntervalDaysChange(parseIntervalDays(next));
            }}
            step={1}
            type="number"
            value={draft}
          />
          <button
            aria-label={t("more")}
            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/40 flex size-10 items-center justify-center rounded-r-lg transition-colors disabled:cursor-not-allowed"
            disabled={!canIncrement}
            onClick={() => {
              if (intervalDays !== undefined) {
                commit(intervalDays + 1);
              }
            }}
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
          </button>
        </div>
        <span className="text-muted-foreground text-sm">{t("days")}</span>
      </div>
      {isInvalid ? (
        <p className="text-destructive text-xs">
          {t("invalid", {
            min: CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
            max: CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
          })}
        </p>
      ) : null}
    </div>
  );
}
