import type {
  DemoClock,
  DemoClockLocalTime,
  DemoClockOffset,
  ZonedParts,
} from "./types/demo-clock";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const FUTURE_CLAMP_MS = 7 * MINUTE_MS;

function offsetMs(offset: DemoClockOffset): number {
  return (
    (offset.days ?? 0) * DAY_MS +
    (offset.hours ?? 0) * HOUR_MS +
    (offset.minutes ?? 0) * MINUTE_MS
  );
}

export function normalizeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) {
    return "UTC";
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "UTC";
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

/** Wall-clock parts of `date` in a valid IANA zone (see `normalizeTimeZone`). */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const values: Record<string, number> = {};
  for (const part of zonedFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }
  const year = values.year ?? 1970;
  const month = values.month ?? 1;
  const day = values.day ?? 1;
  const sundayBased = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    weekday: ((sundayBased + 6) % 7) + 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

/** Milliseconds the zone is ahead of UTC at `date`. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function zonedWallTimeToUtc(
  parts: Pick<ZonedParts, "year" | "month" | "day" | "hour" | "minute">,
  timeZone: string
): Date {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute
  );
  // Two passes settle DST transitions: the offset at the guess can differ
  // from the offset at the real instant by the DST shift.
  const first = guess - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess - zoneOffsetMs(new Date(first), timeZone));
}

/** Calendar day in the zone `daysAgo` days before the zoned date of `now`. */
function zonedCalendarDay(now: Date, timeZone: string, daysAgo: number) {
  const today = zonedParts(now, timeZone);
  const shifted = new Date(
    Date.UTC(today.year, today.month - 1, today.day - daysAgo)
  );
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function createDemoClock(
  now: Date,
  timeZone: string | null | undefined
): DemoClock {
  const zone = normalizeTimeZone(timeZone);
  const nowMs = now.getTime();

  const local = (time: DemoClockLocalTime): Date => {
    const day = zonedCalendarDay(now, zone, time.daysAgo);
    const result = zonedWallTimeToUtc(
      { ...day, hour: time.hour, minute: time.minute ?? 0 },
      zone
    );
    if (result.getTime() > nowMs) {
      return new Date(nowMs - FUTURE_CLAMP_MS);
    }
    return result;
  };

  return {
    ago: (offset) => new Date(nowMs - offsetMs(offset)),
    local,
  };
}

/** Whether `later` falls on a different calendar day than `earlier` in the zone. */
export function isDifferentLocalDay(
  earlier: Date,
  later: Date,
  timeZone: string | null | undefined
): boolean {
  const zone = normalizeTimeZone(timeZone);
  const a = zonedParts(earlier, zone);
  const b = zonedParts(later, zone);
  return a.year !== b.year || a.month !== b.month || a.day !== b.day;
}
