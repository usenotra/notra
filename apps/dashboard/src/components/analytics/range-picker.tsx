"use client";

import { ArrowDown01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@notra/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { useState } from "react";

import { Calendar } from "@/components/calendar";
import { ANALYTICS_RANGE_PRESETS } from "@/constants/analytics";
import { localDayString, parseLocalDay } from "@/lib/analytics/date-range";
import { useAnalyticsRangeLabels } from "@/lib/hooks/use-analytics-range-labels";
import { useRangeSelection } from "@/lib/hooks/use-range-selection";
import type { AnalyticsRangePickerProps } from "@/types/analytics";

export function AnalyticsRangePicker({ control }: AnalyticsRangePickerProps) {
  const presetLabels = useAnalyticsRangeLabels();
  const [open, setOpen] = useState(false);

  const committed =
    control.preset === "custom"
      ? {
          from: parseLocalDay(control.range.dateFrom),
          to: parseLocalDay(control.range.dateTo),
        }
      : undefined;

  const { calendarProps, reset } = useRangeSelection({
    committed,
    disabled: { after: new Date() },
    onCommit: (range) => {
      control.setCustom({
        dateFrom: localDayString(range.from),
        dateTo: localDayString(range.to),
      });
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }
    setOpen(next);
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        render={<Button className="h-7 px-2" size="sm" variant="ghost" />}
      >
        <HugeiconsIcon icon={Calendar03Icon} size={14} />
        <span className="text-xs tabular-nums">{control.label}</span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex">
          <div className="border-border flex flex-col gap-1 border-r p-2">
            {ANALYTICS_RANGE_PRESETS.map((preset) => (
              <Button
                className="justify-start"
                key={preset.value}
                onClick={() => {
                  control.setPreset(preset.value);
                  handleOpenChange(false);
                }}
                size="sm"
                variant={
                  control.preset === preset.value ? "secondary" : "ghost"
                }
              >
                {presetLabels[preset.value].label}
              </Button>
            ))}
          </div>
          <Calendar
            defaultMonth={committed?.from}
            mode="range"
            {...calendarProps}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
