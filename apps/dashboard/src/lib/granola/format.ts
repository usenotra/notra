export function formatGranolaIntegrationDate(
  isoDate: string,
  locale: string
): string {
  return new Date(isoDate).toLocaleDateString(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
