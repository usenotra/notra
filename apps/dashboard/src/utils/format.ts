export function formatDollars(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const COUNT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value);
}

export function formatPercent(value: number): string {
  return PERCENT_FORMATTER.format(value);
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function formatFullDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function formatArticleDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
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

export function formatRelativeTime(date: Date, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 10) {
    return "Saved just now";
  }

  if (seconds < 60) {
    return "Saved seconds ago";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) {
    return "Saved 1 min ago";
  }

  if (minutes < 60) {
    return `Saved ${minutes} min ago`;
  }

  return "Saved over an hour ago";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
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
