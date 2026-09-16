import {
  Calendar03Icon,
  Linkedin01Icon,
  NewTwitterIcon,
  News01Icon,
} from "@hugeicons/core-free-icons";
import type { ConnectedCardItem } from "@notra/ui/components/shared/connected-cards";

import type { SchedulePreset } from "@/types/automation/schedule";

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "weekly-changelog",
    icon: Calendar03Icon,
    label: "Weekly changelog",
    description: "Summarize the week's activity every Monday morning.",
    values: {
      outputType: "changelog",
      schedule: { frequency: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_7_days",
    },
  },
  {
    id: "daily-twitter",
    icon: NewTwitterIcon,
    label: "Daily X post",
    description: "Share a short update from yesterday's activity.",
    values: {
      outputType: "twitter_post",
      schedule: { frequency: "daily", hour: 9, minute: 0 },
      lookbackWindow: "yesterday",
    },
  },
  {
    id: "monthly-blog",
    icon: News01Icon,
    label: "Monthly blog post",
    description: "Turn the month's highlights into a long-form article.",
    values: {
      outputType: "blog_post",
      schedule: { frequency: "monthly", dayOfMonth: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_30_days",
    },
  },
  {
    id: "biweekly-linkedin",
    icon: Linkedin01Icon,
    label: "Bi-weekly LinkedIn post",
    description: "Post a professional update every two weeks.",
    values: {
      outputType: "linkedin_post",
      schedule: { frequency: "custom", intervalDays: 14, hour: 9, minute: 0 },
      lookbackWindow: "last_14_days",
    },
  },
];

export const SCHEDULE_PRESET_CARD_ITEMS: ConnectedCardItem[] =
  SCHEDULE_PRESETS.map((preset) => ({
    id: preset.id,
    icon: preset.icon,
    title: preset.label,
    description: preset.description,
  }));
