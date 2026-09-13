const FALLBACK_TIMEZONE = "UTC";

export function formatCurrentDate(timezone?: string): {
  formatted: string;
  timezone: string;
} {
  const resolvedTimezone = resolveTimezone(timezone);

  const formatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: resolvedTimezone,
  });

  return { formatted, timezone: resolvedTimezone };
}

function resolveTimezone(timezone: string | undefined): string {
  if (!timezone) {
    return FALLBACK_TIMEZONE;
  }

  return isValidTimezone(timezone) ? timezone : FALLBACK_TIMEZONE;
}

export function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
