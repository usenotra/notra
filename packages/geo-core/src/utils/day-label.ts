export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDayLabel(day: string, locale = "en-US"): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return day;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
