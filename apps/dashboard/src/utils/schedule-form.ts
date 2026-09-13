import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "@notra/ai/constants/schedule-interval";
import { toUtcDateString } from "@notra/ai/utils/schedule-interval";
import type {
  LookbackWindow,
  ScheduleOutputType,
} from "@notra/schemas/dashboard/integrations";

import { FORMAT_CARD_META } from "@/constants/content-formats";
import { DEFAULT_SCHEDULE, FREQUENCY_LABELS } from "@/constants/schedule";
import {
  SCHEDULE_PRESETS,
  type SchedulePresetId,
} from "@/constants/schedule-presets";
import type {
  ScheduleCron,
  ScheduleFormValues,
} from "@/types/automation/schedule";
import type { Trigger } from "@/types/triggers/triggers";

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

export function padTimeUnit(value: number): string {
  return value.toString().padStart(2, "0");
}

export function parseTimeValue(
  time: string
): { hour: number; minute: number } | null {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return null;
  }
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

export function formatTimeValue(hour: number, minute: number): string {
  return `${padTimeUnit(hour)}:${padTimeUnit(minute)}`;
}

export function getDefaultScheduleValues(
  editTrigger?: Trigger
): ScheduleFormValues {
  if (editTrigger) {
    const supportedType: ScheduleOutputType =
      editTrigger.outputType === "investor_update"
        ? "changelog"
        : (editTrigger.outputType as ScheduleOutputType);
    return {
      name: editTrigger.name ?? "",
      outputType: supportedType,
      instructions: editTrigger.outputConfig?.instructions ?? "",
      schedule: editTrigger.sourceConfig.cron ?? DEFAULT_SCHEDULE,
      repositoryIds: editTrigger.targets.repositoryIds,
      lookbackWindow: editTrigger.lookbackWindow ?? "last_7_days",
      brandVoiceId:
        editTrigger.outputConfig?.brandVoiceId &&
        editTrigger.outputConfig.brandVoiceId !== "__default__"
          ? editTrigger.outputConfig.brandVoiceId
          : "",
      autoPublish: editTrigger.autoPublish ?? false,
    };
  }
  return {
    name: "",
    outputType: "changelog",
    instructions: "",
    schedule: DEFAULT_SCHEDULE,
    repositoryIds: [],
    lookbackWindow: "last_7_days",
    brandVoiceId: "",
    autoPublish: false,
  };
}

export interface PresetScheduleValues {
  outputType: ScheduleOutputType;
  schedule: ScheduleCron;
  lookbackWindow: LookbackWindow;
}

export function getPresetScheduleValues(
  presetId: SchedulePresetId
): PresetScheduleValues {
  const preset = SCHEDULE_PRESETS.find((item) => item.id === presetId);
  if (!preset) {
    throw new Error(`Unknown schedule preset: ${presetId}`);
  }
  if (preset.values.schedule.frequency === "custom") {
    return {
      ...preset.values,
      schedule: {
        ...preset.values.schedule,
        anchorDate:
          preset.values.schedule.anchorDate ?? toUtcDateString(new Date()),
      },
    };
  }
  return { ...preset.values, schedule: { ...preset.values.schedule } };
}

export function buildAutoScheduleName(
  schedule: Pick<ScheduleCron, "frequency" | "intervalDays">,
  outputType: ScheduleOutputType
): string {
  const typeLabel = FORMAT_CARD_META[outputType].label.toLowerCase();
  if (schedule.frequency === "custom") {
    const days = schedule.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS;
    return `Every ${days} days ${typeLabel}`;
  }
  return `${FREQUENCY_LABELS[schedule.frequency]} ${typeLabel}`;
}
