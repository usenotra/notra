"use client";

import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CUSTOM_SCHEDULE_MAX_INTERVAL_DAYS,
  CUSTOM_SCHEDULE_MIN_INTERVAL_DAYS,
} from "@notra/ai/constants/schedule-interval";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@notra/ui/components/ui/input-group";
import { Label } from "@notra/ui/components/ui/label";
import { useState } from "react";
import { useTranslations } from "use-intl";

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
        <InputGroup className="h-10 w-auto">
          <InputGroupButton
            aria-label={t("fewer")}
            disabled={!canDecrement}
            onClick={() => {
              if (intervalDays !== undefined) {
                commit(intervalDays - 1);
              }
            }}
            type="button"
            size="icon-sm"
          >
            <HugeiconsIcon className="size-4" icon={MinusSignIcon} />
          </InputGroupButton>
          <InputGroupInput
            aria-invalid={isInvalid || undefined}
            className="h-full w-12 flex-none [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
          <InputGroupButton
            aria-label={t("more")}
            disabled={!canIncrement}
            onClick={() => {
              if (intervalDays !== undefined) {
                commit(intervalDays + 1);
              }
            }}
            type="button"
            size="icon-sm"
          >
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
          </InputGroupButton>
        </InputGroup>
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
