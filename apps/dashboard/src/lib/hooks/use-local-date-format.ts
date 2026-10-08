"use client";

import { useCallback } from "react";
import { type DateTimeFormatOptions, useFormatter } from "use-intl";

import { getLocalTimezone } from "@/utils/schedule-summary";

/**
 * Formats dates in the browser's time zone. The next-intl provider has no
 * time zone configured, so its formatter falls back to the server's (UTC on
 * Vercel), while scheduling and day grouping work in local time.
 */
export function useLocalDateFormat() {
  const format = useFormatter();
  return useCallback(
    (date: Date, options: DateTimeFormatOptions) =>
      format.dateTime(date, { ...options, timeZone: getLocalTimezone() }),
    [format]
  );
}
