import type { QueryResult } from "@tinybirdco/sdk";

export const DAY_MS = 86_400_000;

/**
 * A provider the host app (dashboard or API) registers once at startup. It
 * lives on globalThis because Next bundles instrumentation (where it is
 * registered) separately from route handlers (where it is read).
 */
export function demoProviderSlot<T>(name: string) {
  const key = Symbol.for(name);
  const holder = globalThis as Record<symbol, T | null | undefined>;
  return {
    set: (next: T | null) => {
      holder[key] = next;
    },
    get: () => holder[key] ?? null,
  };
}

/** `YYYY-MM-DD` shifted by whole days. */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS
  );
}

export function demoQueryResult<T>(data: T[]): QueryResult<T> {
  return {
    data,
    meta: [],
    rows: data.length,
    statistics: { elapsed: 0, rows_read: data.length, bytes_read: 0 },
  };
}
