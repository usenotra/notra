import { CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS } from "@notra/ai/constants/schedule-interval";
import {
  nextCustomIntervalRun,
  toUtcDateString,
} from "@notra/ai/utils/schedule-interval";

import type { ScheduleCron } from "@/types/automation/schedule";

export function computeNextRun(
  value: ScheduleCron,
  now: Date = new Date()
): Date {
  const next = new Date(now);
  next.setUTCSeconds(0, 0);

  if (value.frequency === "daily") {
    next.setUTCHours(value.hour, value.minute, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  }

  if (value.frequency === "custom") {
    return nextCustomIntervalRun(
      {
        hour: value.hour,
        minute: value.minute,
        intervalDays:
          value.intervalDays ?? CUSTOM_SCHEDULE_DEFAULT_INTERVAL_DAYS,
        anchorDate: value.anchorDate ?? toUtcDateString(now),
      },
      now
    );
  }

  if (value.frequency === "weekly") {
    const targetDay = value.dayOfWeek ?? 1;
    next.setUTCHours(value.hour, value.minute, 0, 0);
    const currentDay = next.getUTCDay();
    let dayDelta = targetDay - currentDay;
    if (dayDelta < 0 || (dayDelta === 0 && next.getTime() <= now.getTime())) {
      dayDelta += 7;
    }
    next.setUTCDate(next.getUTCDate() + dayDelta);
    return next;
  }

  const targetDay = value.dayOfMonth ?? 1;
  next.setUTCDate(1);
  next.setUTCHours(value.hour, value.minute, 0, 0);

  for (let i = 0; i < 13; i++) {
    const lastDayOfMonth = new Date(
      Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
    ).getUTCDate();
    if (targetDay <= lastDayOfMonth) {
      const candidate = new Date(next);
      candidate.setUTCDate(targetDay);
      if (candidate.getTime() > now.getTime()) {
        return candidate;
      }
    }
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
