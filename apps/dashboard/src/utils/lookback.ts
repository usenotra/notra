import type { LookbackWindow } from "@notra/schemas/dashboard/integrations";
import { DateTime, Option } from "effect";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export interface LookbackRange {
  start: Date;
  end: Date;
  label: string;
}

function zonedNow(now: Date, timeZone: string | undefined) {
  if (!timeZone) {
    return null;
  }

  const zone = DateTime.zoneMakeNamed(timeZone);
  return Option.isNone(zone)
    ? null
    : DateTime.setZone(DateTime.makeUnsafe(now), zone.value);
}

function startOfUtcDay(date: Date): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function startOfZonedDay(zoned: DateTime.Zoned): Date {
  return new Date(DateTime.toEpochMillis(DateTime.startOf(zoned, "day")));
}

export function resolveLookbackRange(
  window: LookbackWindow,
  timeZone?: string
): LookbackRange {
  const now = new Date();
  const zoned = zonedNow(now, timeZone);
  const zoneLabel = zoned ? timeZone : "UTC";

  if (window === "current_day") {
    return {
      start: zoned ? startOfZonedDay(zoned) : startOfUtcDay(now),
      end: now,
      label: `current day (${zoneLabel})`,
    };
  }

  if (window === "yesterday") {
    const todayStart = zoned ? startOfZonedDay(zoned) : startOfUtcDay(now);
    const yesterdayStart = zoned
      ? startOfZonedDay(DateTime.subtract(zoned, { days: 1 }))
      : startOfUtcDay(new Date(todayStart.getTime() - 1));
    return {
      start: yesterdayStart,
      end: todayStart,
      label: `previous day (${zoneLabel})`,
    };
  }

  if (window === "last_14_days") {
    return {
      start: new Date(now.getTime() - 14 * DAY_IN_MS),
      end: now,
      label: "last 14 days (rolling)",
    };
  }

  if (window === "last_30_days") {
    return {
      start: new Date(now.getTime() - 30 * DAY_IN_MS),
      end: now,
      label: "last 30 days (rolling)",
    };
  }

  if (window === "last_7_days") {
    return {
      start: new Date(now.getTime() - 7 * DAY_IN_MS),
      end: now,
      label: "last 7 days (rolling)",
    };
  }

  const _exhaustive: never = window;
  return {
    start: new Date(now.getTime() - 7 * DAY_IN_MS),
    end: now,
    label: "last 7 days (rolling)",
  };
}

export function formatTodayContext(now: Date, timeZone?: string): string {
  const zoned = zonedNow(now, timeZone);

  if (!zoned) {
    const weekday = DateTime.format(DateTime.makeUnsafe(now), {
      locale: "en-CA",
      timeZone: "UTC",
      weekday: "long",
    });
    return `${weekday}, ${now.toISOString().slice(0, 10)} (UTC)`;
  }

  const formatted = DateTime.format(zoned, {
    locale: "en-CA",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${formatted} (${timeZone})`;
}
