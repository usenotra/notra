import type {
  GeoCompetitorSharePoint,
  GeoOverviewEngine,
  GeoTimeseriesPoint,
} from "@notra/geo-core/types/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";

import { CHART_PERCENT_SCALE } from "@/constants/charts";
import type {
  GeoDirectionEngineRow,
  GeoDirectionTone,
  GeoDirectionTrendRow,
} from "@/types/geo-directions";
import {
  engineFamilyAvgPosition,
  engineFamilySources,
  engineFamilyTotals,
  groupEngineFamilies,
} from "@/utils/geo-charts";

export function formatDirectionDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
}

export function directionDeltaTone(delta: number): GeoDirectionTone {
  if (delta > 0) {
    return "up";
  }
  if (delta < 0) {
    return "down";
  }
  return "flat";
}

const TOP_POSITION = 2;
const MID_POSITION = 4;

export function directionPositionTone(position: number): string {
  if (position <= TOP_POSITION) {
    return "top";
  }
  if (position <= MID_POSITION) {
    return "mid";
  }
  return "low";
}

export function directionShareOf(
  point: GeoCompetitorSharePoint,
  points: readonly GeoCompetitorSharePoint[]
): number {
  const total = points.reduce((sum, entry) => sum + entry.mentions, 0);
  if (total <= 0) {
    return 0;
  }
  return point.mentions / total;
}

export function buildDirectionOverviewEngines(
  rows: readonly GeoDirectionEngineRow[],
  lastCheckedAt: string
): GeoOverviewEngine[] {
  return rows.map((row) => ({
    engine: row.engine,
    checks: row.checks,
    mentions: Math.round(row.rate * row.checks),
    mentionRate: row.rate,
    avgPosition: row.avgPosition,
    lastCheckedAt,
  }));
}

export function groupDirectionEngineRows(
  rows: readonly GeoDirectionEngineRow[]
): GeoDirectionEngineRow[] {
  const families = groupEngineFamilies(buildDirectionOverviewEngines(rows, ""));
  const byEngine = new Map(rows.map((row) => [row.engine, row]));

  return families.flatMap((family) => {
    const totals = engineFamilyTotals(family);
    const sources = engineFamilySources(family);
    const primary = [...sources].sort(
      (left, right) => right.checks - left.checks
    )[0];
    if (!totals || !primary) {
      return [];
    }
    const matched = sources
      .map((engine) => byEngine.get(engine.engine))
      .find((row) => row !== undefined);
    return [
      {
        engine: primary.engine,
        label: engineFamilyLabel(family.family),
        rate: totals.rate,
        delta: matched?.delta ?? 0,
        checks: totals.checks,
        avgPosition: engineFamilyAvgPosition(family),
      },
    ];
  });
}

export function buildDirectionTrendRows(
  days: readonly string[],
  grounded: readonly number[],
  training: readonly number[]
): GeoDirectionTrendRow[] {
  return days.map((day, index) => ({
    day,
    grounded: grounded[index] ?? 0,
    training: training[index] ?? 0,
  }));
}

export function buildDirectionTimeseries(
  days: readonly string[],
  grounded: readonly number[],
  training: readonly number[],
  groundedEngine: string,
  trainingEngine: string
): GeoTimeseriesPoint[] {
  const points: GeoTimeseriesPoint[] = [];
  days.forEach((day, index) => {
    points.push({
      day,
      engine: groundedEngine,
      checks: CHART_PERCENT_SCALE,
      mentions: grounded[index] ?? 0,
    });
    points.push({
      day,
      engine: trainingEngine,
      checks: CHART_PERCENT_SCALE,
      mentions: training[index] ?? 0,
    });
  });
  return points;
}
