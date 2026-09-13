import type { GeoSentimentRow } from "@notra/db/types/geo-sentiment";

import type { GeoWindowInput } from "../types/geo";
import { summarizeSentiment } from "./geo-sentiment";

export function sentimentPeriods(window: GeoWindowInput, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const to = window.to ?? today;
  const end = Date.parse(`${to}T00:00:00Z`);
  const days = window.days ?? 30;
  const from =
    window.from ??
    new Date(end - (days - 1) * 86400000).toISOString().slice(0, 10);
  const start = Date.parse(`${from}T00:00:00Z`);
  const length = (end - start) / 86400000 + 1;
  if (!Number.isInteger(length) || length < 1 || length > 366) {
    throw new Error("Invalid sentiment date window");
  }
  return {
    current: { from, to },
    previous: {
      from: new Date(start - length * 86400000).toISOString().slice(0, 10),
      to: new Date(start - 86400000).toISOString().slice(0, 10),
    },
    length,
  };
}

export function sentimentPeriodPoints(
  rows: GeoSentimentRow[],
  from: string,
  length: number
) {
  return Array.from({ length }, (_, index) => {
    const day = new Date(Date.parse(`${from}T00:00:00Z`) + index * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      day,
      ...summarizeSentiment(rows.filter((row) => row.day === day)),
    };
  });
}
