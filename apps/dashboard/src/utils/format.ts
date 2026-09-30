import type { CurrencyAffix } from "@/types/billing/plan";

export function formatDollars(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function currencyAffix(locale: string, value: number): CurrencyAffix {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).formatToParts(value);
  const currencyIndex = parts.findIndex((part) => part.type === "currency");
  const integerIndex = parts.findIndex((part) => part.type === "integer");
  return {
    symbol: parts[currencyIndex]?.value ?? "$",
    position: currencyIndex > integerIndex ? "suffix" : "prefix",
  };
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
    value
  );
}

export function formatOneDecimal(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatArticleDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function usageBarColor(percent: number): string {
  return percent > 70 ? "bg-warning" : "bg-success";
}

export function remainingPercent(
  balance: number | null,
  included: number | null
): number | null {
  if (balance === null || included === null || included <= 0) {
    return null;
  }

  return Math.min(Math.max((balance / included) * 100, 0), 100);
}

export function remainingBarColor(percent: number): string {
  if (percent < 10) {
    return "bg-destructive";
  }
  if (percent < 30) {
    return "bg-warning";
  }
  return "bg-success";
}

export function isCreditRange<T extends string>(
  value: string,
  ranges: readonly T[]
): value is T {
  return (ranges as readonly string[]).includes(value);
}

export function formatSnakeCaseLabel(value: string): string {
  return value.replaceAll("_", " ").trim();
}

export function formatBytes(bytes: number, locale: string): string {
  const format = (value: number, unit: "byte" | "kilobyte" | "megabyte") =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
      maximumFractionDigits: unit === "byte" ? 0 : 1,
      minimumFractionDigits: unit === "byte" ? 0 : 1,
    }).format(value);
  if (bytes < 1024) {
    return format(bytes, "byte");
  }
  if (bytes < 1024 * 1024) {
    return format(bytes / 1024, "kilobyte");
  }
  return format(bytes / 1024 / 1024, "megabyte");
}

export function truncateSnippet(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1)}…`;
}

export function truncateText(value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return "";
  }

  if (value.length <= maxLength) {
    return value;
  }

  const hiddenCharacters = value.length - maxLength;
  if (hiddenCharacters <= 3) {
    return value;
  }

  return `${value.slice(0, maxLength)}…`;
}
