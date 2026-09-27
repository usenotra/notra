"use client";

import { CRON_FREQUENCIES } from "@notra/schemas/dashboard/integrations";
import { cn } from "@notra/ui/lib/utils";
import { useTranslations } from "next-intl";

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
          <button
            aria-pressed={isActive}
            className={cn(
              "h-10 rounded-lg border px-3 text-sm font-medium transition-all",
              isActive
                ? "border-foreground bg-muted text-foreground font-semibold"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {t(option)}
          </button>
        );
      })}
    </div>
  );
}
