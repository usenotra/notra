import { competitorKey } from "@notra/geo-core/geo/domain";
import type {
  GeoCompetitor,
  GeoCompetitorEngineMatrixResponse,
} from "@notra/geo-core/types/geo";
import { competitorCanonicalMap } from "@notra/geo-core/utils/geo-competitor-names";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";

import {
  GEO_ENGINE_MATRIX_LIGHT_TEXT_TINT,
  GEO_ENGINE_MATRIX_MAX_ROWS,
  GEO_ENGINE_MATRIX_MAX_TINT,
  GEO_ENGINE_MATRIX_MIN_TINT,
} from "@/constants/geo-competitors";
import type { EngineMatrix, EngineMatrixColumn } from "@/types/geo";

import { isTrackedFamily, trackedEngineFamilies } from "./geo-charts";
import { isOwnBrandName } from "./geo-competitors";

interface FamilyTotals {
  column: EngineMatrixColumn;
  engineChecks: number;
  ownMentions: number;
}

function familyColumns(
  engines: GeoCompetitorEngineMatrixResponse["engines"],
  trackedEngines: readonly string[]
): FamilyTotals[] {
  const tracked = trackedEngineFamilies(trackedEngines);
  const byFamily = new Map<string, FamilyTotals>();
  for (const row of engines) {
    const family = engineFamilyOf(row.engine);
    if (row.checks === 0 || !isTrackedFamily(family, tracked)) {
      continue;
    }
    const totals = byFamily.get(family) ?? {
      column: {
        family,
        engine: row.engine,
        label: engineFamilyLabel(family),
        checks: 0,
      },
      engineChecks: 0,
      ownMentions: 0,
    };
    totals.column.checks += row.checks;
    totals.ownMentions += row.mentions;
    if (row.checks > totals.engineChecks) {
      totals.column.engine = row.engine;
      totals.engineChecks = row.checks;
    }
    byFamily.set(family, totals);
  }
  // Enabled assistants without answers in the range keep their column, so
  // the gap reads as "no answers" instead of the assistant going missing.
  for (const engine of trackedEngines) {
    const family = engineFamilyOf(engine);
    if (!byFamily.has(family)) {
      byFamily.set(family, {
        column: { family, engine, label: engineFamilyLabel(family), checks: 0 },
        engineChecks: 0,
        ownMentions: 0,
      });
    }
  }
  return [...byFamily.values()].sort(
    (left, right) =>
      right.column.checks - left.column.checks ||
      left.column.label.localeCompare(right.column.label)
  );
}

/**
 * Brand × assistant mention rates. Your row uses the `mentioned` flag, so it
 * matches the overview; competitor rows count mentions folded onto their
 * canonical name, divided by the same per-assistant checks.
 */
export function buildEngineMatrix(
  data: GeoCompetitorEngineMatrixResponse | undefined,
  options: {
    companyName: string | null;
    aliases?: readonly string[];
    competitors?: readonly GeoCompetitor[];
    trackedEngines?: readonly string[];
  }
): EngineMatrix {
  const families = familyColumns(
    data?.engines ?? [],
    options.trackedEngines ?? []
  );
  const columnIndex = new Map(
    families.map((totals, index) => [totals.column.family, index])
  );
  const canonicalByKey = competitorCanonicalMap(options.competitors ?? []);
  const trackedKeys = new Set(
    Array.from(canonicalByKey.values(), competitorKey)
  );

  const brands = new Map<string, { brand: string; mentions: number[] }>();
  // Seeded so a tracked competitor without mentions shows its 0% row.
  for (const competitor of options.competitors ?? []) {
    if (
      !isOwnBrandName(competitor.name, options.companyName, options.aliases)
    ) {
      brands.set(competitorKey(competitor.name), {
        brand: competitor.name,
        mentions: families.map(() => 0),
      });
    }
  }
  for (const cell of data?.cells ?? []) {
    const index = columnIndex.get(engineFamilyOf(cell.engine));
    if (
      index === undefined ||
      isOwnBrandName(cell.brand, options.companyName, options.aliases)
    ) {
      continue;
    }
    const brand = canonicalByKey.get(competitorKey(cell.brand)) ?? cell.brand;
    const key = competitorKey(brand);
    const entry = brands.get(key) ?? {
      brand,
      mentions: families.map(() => 0),
    };
    entry.mentions[index] = (entry.mentions[index] ?? 0) + cell.mentions;
    brands.set(key, entry);
  }

  const total = (mentions: readonly number[]) =>
    mentions.reduce((sum, value) => sum + value, 0);
  // Tracked competitors are what the user asked to compare against; untracked
  // brands only fill in while nothing is tracked yet.
  const ranked = [...brands.entries()]
    .filter(([key]) => trackedKeys.size === 0 || trackedKeys.has(key))
    .map(([, entry]) => entry)
    .sort((left, right) => total(right.mentions) - total(left.mentions));

  const toRate = (mentions: number, checks: number) =>
    checks === 0 ? null : mentions / checks;

  const rows: EngineMatrix["rows"] = [];
  if (options.companyName) {
    rows.push({
      brand: options.companyName,
      own: true,
      rates: families.map((totals) =>
        toRate(totals.ownMentions, totals.column.checks)
      ),
      mentions: families.map((totals) => totals.ownMentions),
    });
  }
  for (const entry of ranked) {
    if (rows.length >= GEO_ENGINE_MATRIX_MAX_ROWS) {
      break;
    }
    rows.push({
      brand: entry.brand,
      own: false,
      rates: families.map((totals, index) =>
        toRate(entry.mentions[index] ?? 0, totals.column.checks)
      ),
      mentions: families.map((_, index) => entry.mentions[index] ?? 0),
    });
  }

  let maxRate = 0;
  let minRate = 1;
  for (const row of rows) {
    for (const rate of row.rates) {
      if (rate !== null) {
        maxRate = Math.max(maxRate, rate);
        minRate = Math.min(minRate, rate);
      }
    }
  }

  return {
    columns: families.map((totals) => totals.column),
    rows,
    minRate: Math.min(minRate, maxRate),
    maxRate,
  };
}

/**
 * Tint in percent, spread between the weakest and strongest cell so rates
 * that sit close together still read apart.
 */
export function engineMatrixTint(
  rate: number,
  minRate: number,
  maxRate: number
): number {
  if (rate <= 0 || maxRate <= 0) {
    return 0;
  }
  const span = maxRate - minRate;
  const position = span > 0 ? (rate - minRate) / span : 1;
  return Math.round(
    GEO_ENGINE_MATRIX_MIN_TINT +
      position * (GEO_ENGINE_MATRIX_MAX_TINT - GEO_ENGINE_MATRIX_MIN_TINT)
  );
}

export function engineMatrixUsesLightText(tint: number): boolean {
  return tint > GEO_ENGINE_MATRIX_LIGHT_TEXT_TINT;
}
