"use client";

import { ArrowDown01Icon, Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_FILTER_TRIGGER_CLASS,
  GEO_MAX_RANGE_DAYS,
  GEO_RANGE_PRESETS,
} from "@notra/geo-core/constants/geo";
import { Button } from "@notra/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@notra/ui/components/ui/popover";
import { TRANSITION } from "@notra/ui/lib/motion";
import { LazyMotion, m, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "@/components/calendar";
import { GEO_RANGE_PRESET_LABEL_KEYS } from "@/constants/geo-analytics";
import { useAnimatedSize } from "@/lib/hooks/use-animated-size";
import type { GeoRangePickerProps } from "@/types/geo";
import {
  geoCalendarDefaultMonth,
  geoCustomRangeLabel,
  localDayString,
  parseLocalDay,
} from "@/utils/geo-range";

const loadMotionFeatures = () =>
  import("@/lib/motion-features").then((mod) => mod.default);

export function GeoRangePicker({ control }: GeoRangePickerProps) {
  const t = useTranslations("geo.geoRangePicker");
  const tLabels = useTranslations("common.labels");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();
  const reduceMotion = useReducedMotion();
  const { ref: contentRef, size } = useAnimatedSize();

  const selected =
    draft ??
    (control.preset === "custom"
      ? {
          from: parseLocalDay(control.range.dateFrom),
          to: parseLocalDay(control.range.dateTo),
        }
      : undefined);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDraft(undefined);
    }
    setOpen(next);
  };

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        aria-label={t("label")}
        className={GEO_FILTER_TRIGGER_CLASS}
      >
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={Calendar03Icon}
          size={12}
        />
        <span className="tabular-nums">
          {control.preset === "custom"
            ? geoCustomRangeLabel(control.range, locale)
            : tLabels(GEO_RANGE_PRESET_LABEL_KEYS[control.preset])}
        </span>
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={ArrowDown01Icon}
          size={12}
        />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto overflow-hidden p-0">
        <LazyMotion features={loadMotionFeatures} strict>
          <m.div
            animate={
              size ? { width: size.width, height: size.height } : undefined
            }
            className="overflow-hidden"
            initial={false}
            transition={reduceMotion ? { duration: 0 } : TRANSITION.resize}
          >
            <div className="flex w-max" ref={contentRef}>
              <div className="border-border flex min-w-44 flex-col gap-1 border-r p-2">
                {GEO_RANGE_PRESETS.map((preset) => (
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
                    {tLabels(GEO_RANGE_PRESET_LABEL_KEYS[preset.value])}
                  </Button>
                ))}
              </div>
              <Calendar
                defaultMonth={geoCalendarDefaultMonth(selected?.from)}
                disabled={{ after: new Date() }}
                max={GEO_MAX_RANGE_DAYS - 1}
                mode="range"
                numberOfMonths={2}
                onSelect={(next) => {
                  setDraft(next);
                  if (next?.from && next.to) {
                    control.setCustom({
                      dateFrom: localDayString(next.from),
                      dateTo: localDayString(next.to),
                    });
                  }
                }}
                selected={selected}
              />
            </div>
          </m.div>
        </LazyMotion>
      </PopoverContent>
    </Popover>
  );
}
