import type { GeoCheckCompetitorShareAggregateRow } from "@notra/db/types/geo-checks";

import type { GeoCompetitorShareResponse } from "../types/geo";

export function summarizeGeoCompetitorShare(
  aggregates: readonly GeoCheckCompetitorShareAggregateRow[],
  limit: number
): Pick<GeoCompetitorShareResponse, "points" | "timeseries"> {
  const timeseries = aggregates.flatMap((row) =>
    row.day === null
      ? []
      : [{ brand: row.brand, day: row.day, mentions: row.mentions }]
  );
  const totals = new Map<string, number>();
  for (const row of timeseries) {
    totals.set(row.brand, (totals.get(row.brand) ?? 0) + row.mentions);
  }
  const ranked = [...totals]
    .sort(
      ([leftBrand, leftTotal], [rightBrand, rightTotal]) =>
        rightTotal - leftTotal || leftBrand.localeCompare(rightBrand)
    )
    .slice(0, limit);
  const selectedBrands = new Set(ranked.map(([brand]) => brand));
  const dailyMentions = new Map<string, Map<string, number>>();
  const dailyTotals = new Map<string, number>();
  for (const row of timeseries) {
    if (!selectedBrands.has(row.brand)) {
      continue;
    }
    const mentions = dailyMentions.get(row.day) ?? new Map<string, number>();
    mentions.set(row.brand, row.mentions);
    dailyMentions.set(row.day, mentions);
    dailyTotals.set(row.day, (dailyTotals.get(row.day) ?? 0) + row.mentions);
  }
  const days = [...dailyMentions.keys()].sort();
  const points = aggregates
    .filter((row) => row.day === null)
    .sort(
      (left, right) =>
        right.mentions - left.mentions || left.brand.localeCompare(right.brand)
    )
    .slice(0, limit)
    .map(({ brand, mentions }) => ({
      brand,
      mentions,
      trend: selectedBrands.has(brand)
        ? days.map((day) => {
            const total = dailyTotals.get(day) ?? 0;
            return {
              day,
              value:
                total === 0
                  ? 0
                  : Math.round(
                      ((dailyMentions.get(day)?.get(brand) ?? 0) * 1000) / total
                    ) / 1000,
            };
          })
        : [],
    }));
  return { points, timeseries };
}
