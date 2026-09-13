const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const UTC_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Content activity uses UTC calendar days. Keeping the range construction here
 * prevents application-server local time from changing which posts belong to a
 * day or reporting year.
 */
export function getUtcDayRange(dateParam: string | null, now = new Date()) {
  if (!dateParam) {
    return null;
  }

  if (dateParam !== "today" && !UTC_DATE_ONLY_PATTERN.test(dateParam)) {
    return null;
  }

  const date =
    dateParam === "today" ? now : new Date(`${dateParam}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    (dateParam !== "today" && date.toISOString().slice(0, 10) !== dateParam)
  ) {
    return null;
  }

  const startDate = new Date(date);
  startDate.setUTCHours(0, 0, 0, 0);

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
