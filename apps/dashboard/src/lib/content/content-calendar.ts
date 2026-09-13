const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

/**
 * Content activity uses UTC calendar days. Keeping the range construction here
 * prevents application-server local time from changing which posts belong to a
 * day or reporting year.
 */
export function getUtcDayRange(dateParam: string | null, now = new Date()) {
  if (!dateParam) {
    return null;
  }

  const date = dateParam === "today" ? now : new Date(dateParam);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const startDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  return {
    startDate,
    endDate: new Date(startDate.getTime() + DAY_IN_MILLISECONDS),
  };
}

export function getUtcYearRange(now = new Date()) {
  const year = now.getUTCFullYear();

  return {
    startDate: new Date(Date.UTC(year, 0, 1)),
    endDate: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function getUtcDateKeys(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];

  for (
    let timestamp = startDate.getTime();
    timestamp < endDate.getTime();
    timestamp += DAY_IN_MILLISECONDS
  ) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }

  return dates;
}
