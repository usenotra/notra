"use client";

import { ConnectedCards } from "@notra/ui/components/shared/connected-cards";

import {
  SCHEDULE_PRESET_CARD_ITEMS,
  SCHEDULE_PRESETS,
} from "@/constants/schedule-presets";
import type { ScheduleQuickStartProps } from "@/types/automation/schedule";

export function ScheduleQuickStart({ onSelect }: ScheduleQuickStartProps) {
  const handleSelect = (id: string) => {
    const preset = SCHEDULE_PRESETS.find((item) => item.id === id);
    if (preset) {
      onSelect(preset.id);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Quick start</h2>
        <p className="text-muted-foreground text-sm">
          Start from a common cadence, then tweak anything before saving.
        </p>
      </div>
      <ConnectedCards
        items={SCHEDULE_PRESET_CARD_ITEMS}
        onSelect={handleSelect}
      />
    </div>
  );
}
