"use client";

import { ConnectedCards } from "@notra/ui/components/shared/connected-cards";
import { useTranslations } from "next-intl";

import { SCHEDULE_PRESETS } from "@/constants/schedule-presets";
import type { ScheduleQuickStartProps } from "@/types/automation/schedule";

export function ScheduleQuickStart({ onSelect }: ScheduleQuickStartProps) {
  const t = useTranslations("automation.schedules.quickStart");
  const tCommon = useTranslations("common");
  const tQuickStart = useTranslations("apiKeys.quickStart");
  const items = SCHEDULE_PRESETS.map((preset) => ({
    id: preset.id,
    icon: preset.icon,
    title: t(`presets.${preset.id}.label`),
    description: t(`presets.${preset.id}.description`),
    docsLabel: tQuickStart("viewDocs"),
    selectLabel: t("createSchedule", {
      title: t(`presets.${preset.id}.label`),
    }),
  }));
  const handleSelect = (id: string) => {
    const preset = SCHEDULE_PRESETS.find((item) => item.id === id);
    if (preset) {
      onSelect(preset.id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {tCommon("labels.quickStart")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <ConnectedCards items={items} onSelect={handleSelect} />
    </div>
  );
}
