import { DEFAULT_SECURITY_DATE_LOCALE } from "@notra/ui/constants/security-labels";

export function formatSecurityDate(
  value: string | null | undefined,
  locale: string = DEFAULT_SECURITY_DATE_LOCALE
) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
