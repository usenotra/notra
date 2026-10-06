"use client";

import { CRON_FREQUENCIES } from "@notra/schemas/dashboard/integrations";
import { useTranslations } from "use-intl";

import { Button } from "@/components/button";
import type { ScheduleFrequencyTabsProps } from "@/types/automation/schedule";

export function ScheduleFrequencyTabs({
  value,
  onChange,
}: ScheduleFrequencyTabsProps) {
  const t = useTranslations("common.labels");
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {CRON_FREQUENCIES.map((option) => {
        const isActive = option === value;
        return (
          <Button
            aria-pressed={isActive}
            className="h-10"
            key={option}
            onClick={() => onChange(option)}
            type="button"
            variant={isActive ? "secondary" : "outline"}
          >
            {t(option)}
          </Button>
        );
      })}
    </div>
  );
}
