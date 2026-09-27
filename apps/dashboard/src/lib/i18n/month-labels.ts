const MONTHS_IN_YEAR = 12;
const REFERENCE_YEAR = 2024;

export function shortMonthLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    timeZone: "UTC",
  });
  return Array.from({ length: MONTHS_IN_YEAR }, (_, month) =>
    formatter.format(new Date(Date.UTC(REFERENCE_YEAR, month, 1)))
  );
}
