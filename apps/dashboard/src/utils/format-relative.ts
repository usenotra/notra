const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] =
  [
    { unit: "day", ms: 86_400_000 },
    { unit: "hour", ms: 3_600_000 },
    { unit: "minute", ms: 60_000 },
  ];

export function formatRelative(
  iso: string,
  locale: string,
  justNowLabel: string,
  now = Date.now()
): string {
  const diff = new Date(iso).getTime() - now;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (Math.abs(diff) >= ms) {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }
  return justNowLabel;
}
