import {
  Calendar03Icon,
  Linkedin01Icon,
  NewTwitterIcon,
  News01Icon,
} from "@hugeicons/core-free-icons";

import type { SchedulePreset } from "@/types/automation/schedule";

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  {
    id: "weekly-changelog",
    icon: Calendar03Icon,
    values: {
      outputType: "changelog",
      schedule: { frequency: "weekly", dayOfWeek: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_7_days",
    },
  },
  {
    id: "daily-twitter",
    icon: NewTwitterIcon,
    values: {
      outputType: "twitter_post",
      schedule: { frequency: "daily", hour: 9, minute: 0 },
      lookbackWindow: "yesterday",
    },
  },
  {
    id: "monthly-blog",
    icon: News01Icon,
    values: {
      outputType: "blog_post",
      schedule: { frequency: "monthly", dayOfMonth: 1, hour: 9, minute: 0 },
      lookbackWindow: "last_30_days",
    },
  },
  {
    id: "biweekly-linkedin",
    icon: Linkedin01Icon,
    values: {
      outputType: "linkedin_post",
      schedule: { frequency: "custom", intervalDays: 14, hour: 9, minute: 0 },
      lookbackWindow: "last_14_days",
    },
  },
];
