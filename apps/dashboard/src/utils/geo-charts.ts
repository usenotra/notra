import {
  GEO_ENGINE_LABELS,
  GEO_MENTION_TREND_BACKFILL_DAYS,
  GEO_MENTION_TREND_TOTAL_KEY,
  GEO_SEARCH_LABEL,
  GEO_SHARE_OF_VOICE_TOP_BRANDS,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_STAT_DELTA_NEW_LABEL,
} from "@notra/geo-core/constants/geo";
import type {
  EngineFamilyModeTrendRow,
  EngineFamilyStatTrends,
  FamilyDayBucket,
  GeoCompetitor,
  GeoCompetitorSharePoint,
  GeoEngineFamily,
  GeoEngineFamilyTotals,
  GeoEngineMode,
  GeoEngineVariant,
  GeoOverviewEngine,
  GeoSparklinePoint,
  GeoStatDeltaKind,
  GeoStatDeltaTone,
  GeoTimeseriesPoint,
  MentionProviderRow,
  MentionRateSparklineOptions,
  MentionTrend,
  MentionTrendRow,
  ShareOfVoiceBreakdown,
  ShareOfVoiceDonutSlice,
  ShareOfVoiceRow,
} from "@notra/geo-core/types/geo";
import {
  isGeoStatDeltaNew,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { formatDayLabel, todayIsoDate } from "@notra/geo-core/utils/day-label";
import {
  engineFamilyLabel,
  engineFamilyOf,
  engineModelOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { isGroundedEngine } from "@notra/geo-core/utils/geo-presence";
import { sumGeoSparklinePoints } from "@notra/geo-core/utils/geo-sparkline";

import {
  CHART_MIN_BAR_PERCENT,
  SHARE_OF_VOICE_AGGREGATE_ID,
  SHARE_OF_VOICE_AGGREGATE_LABEL,
  CHART_PERCENT_SCALE,
} from "@/constants/charts";

import { chartKey } from "./chart-keys";
import {
  isTrackedShareOfVoiceBrand,
  mergeCompetitorSharePoints,
} from "./geo-competitors";
import { formatModelLabel } from "./geo-model-display";

const GPT_PREFIX_PATTERN = /^gpt-/i;
const MINI_SUFFIX_PATTERN = /-mini$/i;

export function buildShareOfVoiceBreakdown(
  points: readonly GeoCompetitorSharePoint[],
  options?: {
    limit?: number;
    competitors?: readonly GeoCompetitor[];
    companyName?: string | null;
    aliases?: readonly string[];
  }
): ShareOfVoiceBreakdown {
  const limit = options?.limit ?? GEO_SHARE_OF_VOICE_TOP_BRANDS;
  const merged = mergeCompetitorSharePoints(points, options?.competitors);
  const ownBrand = {
    companyName: options?.companyName,
    aliases: options?.aliases,
  };
  const top = merged.slice(0, limit);
  const rest = merged.slice(limit);
  const otherTotal = rest.reduce((sum, point) => sum + point.mentions, 0);
  const total =
    top.reduce((sum, point) => sum + point.mentions, 0) + otherTotal;
  const toRow = (
    brand: string,
    mentions: number,
    trend: readonly GeoSparklinePoint[]
  ): ShareOfVoiceRow => ({
    id: `brand:${brand}`,
    kind: "brand",
    brand,
    mentions,
    share: total > 0 ? mentions / total : 0,
    trend: [...trend],
    tracked: isTrackedShareOfVoiceBrand(brand, options?.competitors, ownBrand),
  });
  const rows = top.map((point) =>
    toRow(point.brand, point.mentions, point.trend ?? [])
  );
  if (otherTotal > 0) {
    rows.push({
      id: SHARE_OF_VOICE_AGGREGATE_ID,
      kind: "aggregate",
      brand: SHARE_OF_VOICE_AGGREGATE_LABEL,
      mentions: otherTotal,
      share: total > 0 ? otherTotal / total : 0,
      trend: sumGeoSparklinePoints(rest.map((point) => point.trend ?? [])),
      tracked: false,
    });
  }
  return {
    rows,
    others: rest.map((point) =>
      toRow(point.brand, point.mentions, point.trend ?? [])
    ),
  };
}

export function buildShareOfVoiceRows(
  points: readonly GeoCompetitorSharePoint[],
  options?: {
    limit?: number;
    competitors?: readonly GeoCompetitor[];
    companyName?: string | null;
    aliases?: readonly string[];
  }
): ShareOfVoiceRow[] {
  return buildShareOfVoiceBreakdown(points, options).rows;
}

export function toShareOfVoiceDonutSlices(
  rows: readonly ShareOfVoiceRow[]
): ShareOfVoiceDonutSlice[] {
  return rows.map((row, index) => ({
    ...row,
    slice: chartKey(`${row.id}-${index}`),
  }));
}

export function formatMentionRate(rate: number): string {
  return `${Math.round(rate * CHART_PERCENT_SCALE)}%`;
}

export function formatChartPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatChartInteger(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

const SHARE_DECIMALS = 10;
const MIN_SHARE_PERCENT = 0.1;

export function formatUsageShare(share: number): string {
  const percent = share * CHART_PERCENT_SCALE;
  if (percent > 0 && percent < MIN_SHARE_PERCENT) {
    return `<${MIN_SHARE_PERCENT}%`;
  }
  return `${Math.round(percent * SHARE_DECIMALS) / SHARE_DECIMALS}%`;
}

export function barWidthPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) {
    return 0;
  }
  return Math.max((value / max) * CHART_PERCENT_SCALE, CHART_MIN_BAR_PERCENT);
}

const DAY_MS = 86_400_000;

export function listDaysThrough(firstDay: string, lastDay: string): string[] {
  const start = new Date(`${firstDay}T00:00:00Z`);
  const end = new Date(`${lastDay}T00:00:00Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.getTime() > end.getTime()
  ) {
    return [];
  }
  const days: string[] = [];
  for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.push(day);
  }
  return days;
}

export function fitMentionTrendLine(
  rows: readonly MentionTrendRow[],
  key: string,
  today = todayIsoDate()
): (number | null)[] {
  let count = 0;
  let sumIndex = 0;
  let sumValue = 0;
  let sumProduct = 0;
  let sumSquares = 0;
  let firstIndex: number | null = null;
  let lastObservedIndex: number | null = null;
  for (const [index, row] of rows.entries()) {
    const value = row[key];
    if (typeof value !== "number") {
      continue;
    }
    lastObservedIndex = index;
    if (row.rawDay === today) {
      continue;
    }
    count += 1;
    sumIndex += index;
    sumValue += value;
    sumProduct += index * value;
    sumSquares += index * index;
    firstIndex ??= index;
  }
  if (count === 0 || firstIndex === null || lastObservedIndex === null) {
    return rows.map(() => null);
  }

  const denominator = count * sumSquares - sumIndex * sumIndex;
  const slope =
    denominator === 0
      ? 0
      : (count * sumProduct - sumIndex * sumValue) / denominator;
  const intercept = (sumValue - slope * sumIndex) / count;

  return rows.map((_, index) =>
    index >= firstIndex && index <= lastObservedIndex
      ? Math.max(0, intercept + slope * index)
      : null
  );
}

export function mentionTrendEmptyLabel(
  row: Record<string, unknown> | undefined,
  keys: readonly string[]
): string {
  const scanned =
    row != null && keys.some((key) => typeof row[key] === "number");
  return scanned ? "No mentions" : "Not scanned";
}

export function latestChartDay(
  lastKnownDay: string,
  today = todayIsoDate()
): string {
  return lastKnownDay > today ? lastKnownDay : today;
}

function ratePercent(mentions: number, checks: number): number | null {
  if (checks <= 0) {
    return null;
  }
  return Math.round((mentions / checks) * CHART_PERCENT_SCALE);
}

export function mentionRateSparkline(
  points: readonly GeoTimeseriesPoint[],
  options?: MentionRateSparklineOptions
): GeoSparklinePoint[] {
  const family = options?.family;
  const model = options?.model;
  const mode = options?.mode ?? "all";
  const byDay = new Map<string, { mentions: number; checks: number }>();
  for (const point of points) {
    if (family && engineFamilyOf(point.engine) !== family) {
      continue;
    }
    if (model && engineModelOf(point.engine) !== model) {
      continue;
    }
    if (mode === "search" && !isGroundedEngine(point.engine)) {
      continue;
    }
    if (mode === "memory" && isGroundedEngine(point.engine)) {
      continue;
    }
    const bucket = byDay.get(point.day) ?? { mentions: 0, checks: 0 };
    bucket.mentions += point.mentions;
    bucket.checks += point.checks;
    byDay.set(point.day, bucket);
  }
  return [...byDay.keys()].sort().flatMap((day) => {
    const bucket = byDay.get(day);
    if (!bucket) {
      return [];
    }
    const value = ratePercent(bucket.mentions, bucket.checks);
    return value === null ? [] : [{ day, value }];
  });
}

export function mentionRateSparklineLabel(
  points: readonly GeoSparklinePoint[]
): string {
  const first = points[0];
  const last = points.at(-1);
  if (!(first && last)) {
    return "Mention rate trend";
  }
  const from = formatChartPercent(first.value);
  const to = formatChartPercent(last.value);
  if (points.length === 1) {
    return `Mention rate ${from}`;
  }
  if (from === to) {
    return `Mention rate held at ${to} over ${points.length} days`;
  }
  return `Mention rate ${from} to ${to} over ${points.length} days`;
}

function daysWithSettledUsage(
  knownDays: readonly string[],
  today = todayIsoDate()
): string[] {
  const settled = knownDays.filter((day) => day < today);
  return settled.length > 0 ? [...settled] : [...knownDays];
}

function engineMentionTotal(
  engine: string,
  days: readonly string[],
  byDay: ReadonlyMap<string, ReadonlyMap<string, GeoTimeseriesPoint>>
): number {
  return days.reduce(
    (total, day) => total + (byDay.get(day)?.get(engine)?.mentions ?? 0),
    0
  );
}

export function buildMentionTrendRows(
  points: GeoTimeseriesPoint[]
): MentionTrend {
  const byDay = new Map<string, Map<string, GeoTimeseriesPoint>>();
  for (const point of points) {
    const model = engineModelOf(point.engine);
    const dayPoints: Map<string, GeoTimeseriesPoint> =
      byDay.get(point.day) ?? new Map();
    const existing = dayPoints.get(model);
    dayPoints.set(model, {
      day: point.day,
      engine: model,
      checks: (existing?.checks ?? 0) + point.checks,
      mentions: (existing?.mentions ?? 0) + point.mentions,
    });
    byDay.set(point.day, dayPoints);
  }

  const knownDays = [...byDay.keys()].sort();
  const usageWindow = daysWithSettledUsage(knownDays);
  const engines = [
    ...new Set(points.map((point) => engineModelOf(point.engine))),
  ];
  const firstDay = knownDays.at(0);
  const lastDay = knownDays.at(-1);
  const isFirstScan = knownDays.length === 1;
  const chartFirstDay =
    firstDay && isFirstScan
      ? new Date(
          new Date(`${firstDay}T00:00:00Z`).getTime() -
            GEO_MENTION_TREND_BACKFILL_DAYS * DAY_MS
        )
          .toISOString()
          .slice(0, 10)
      : firstDay;
  const days =
    isFirstScan && chartFirstDay && lastDay
      ? listDaysThrough(chartFirstDay, lastDay)
      : knownDays;
  const rows = days.map((day) => {
    const row: MentionTrendRow = { day: formatDayLabel(day), rawDay: day };
    const dayPoints = byDay.get(day);
    let total = 0;
    let sampled = false;
    for (const engine of engines) {
      const point = dayPoints?.get(engine);
      if (point) {
        row[chartKey(engine)] = point.mentions;
        total += point.mentions;
        sampled = true;
      }
    }
    row[GEO_MENTION_TREND_TOTAL_KEY] =
      sampled || (isFirstScan && !dayPoints) ? total : null;
    return row;
  });

  const ranked = [...engines].sort(
    (left, right) =>
      engineMentionTotal(right, usageWindow, byDay) -
      engineMentionTotal(left, usageWindow, byDay)
  );

  return { rows, engines: ranked };
}

export function engineVariantLabel(model: string, brandLabel: string): string {
  const label = engineFamilyLabel(model);
  const prefix = `${brandLabel} `;
  if (label.startsWith(prefix)) {
    return label.slice(prefix.length);
  }
  if (label !== brandLabel) {
    return label;
  }
  const slug = engineModelOf(model).split("/").at(-1);
  if (slug?.toLowerCase().startsWith("gpt-")) {
    return slug
      .replace(GPT_PREFIX_PATTERN, "GPT-")
      .replace(MINI_SUFFIX_PATTERN, " mini");
  }
  return label;
}

export function formatEngineFamily(engine: string): string {
  const model = engineModelOf(engine);
  return (
    GEO_ENGINE_LABELS[model] ??
    GEO_ENGINE_LABELS[engine] ??
    GEO_ENGINE_LABELS[`${model}-grounded`] ??
    formatModelLabel(model)
  );
}

export function engineAnswerMode(engine: string): string | null {
  return isGroundedEngine(engine) ? GEO_SEARCH_LABEL : null;
}

export function sharedEngineAnswerMode(
  engines: readonly string[]
): string | null {
  const first = engines[0];
  if (!first) {
    return null;
  }
  const mode = engineAnswerMode(first);
  return engines.every((engine) => engineAnswerMode(engine) === mode)
    ? mode
    : null;
}

export function formatEngineWithMode(engine: string): string {
  const family = formatEngineFamily(engine);
  const mode = engineAnswerMode(engine);
  return mode ? `${family} ${mode}` : family;
}

export function engineFamilySources(
  family: GeoEngineFamily
): GeoOverviewEngine[] {
  return family.variants.flatMap((variant) =>
    [variant.web, variant.raw].filter(
      (engine): engine is GeoOverviewEngine => engine !== null
    )
  );
}

export function engineFamilyAvgPosition(
  family: GeoEngineFamily
): number | null {
  const ranked = engineFamilySources(family)
    .filter((engine) => engine.avgPosition !== null)
    .sort((left, right) => right.checks - left.checks);
  return ranked[0]?.avgPosition ?? null;
}

export function engineFamilyLastCheckedAt(
  family: GeoEngineFamily
): string | null {
  let latest: string | null = null;
  for (const engine of engineFamilySources(family)) {
    if (
      engine.lastCheckedAt &&
      (latest === null || engine.lastCheckedAt > latest)
    ) {
      latest = engine.lastCheckedAt;
    }
  }
  return latest;
}

function emptyVariant(model: string): GeoEngineVariant {
  return { model, web: null, raw: null };
}

function variantPeakRate(variant: GeoEngineVariant): number {
  return Math.max(variant.web?.mentionRate ?? 0, variant.raw?.mentionRate ?? 0);
}

export function groupEngineFamilies(
  engines: GeoOverviewEngine[]
): GeoEngineFamily[] {
  const families = new Map<string, Map<string, GeoEngineVariant>>();
  for (const engine of engines) {
    const family = engineFamilyOf(engine.engine);
    const model = engineModelOf(engine.engine);
    const variants = families.get(family) ?? new Map();
    const variant = variants.get(model) ?? emptyVariant(model);
    if (isGroundedEngine(engine.engine)) {
      variant.web = engine;
    } else {
      variant.raw = engine;
    }
    variants.set(model, variant);
    families.set(family, variants);
  }
  return [...families.entries()]
    .map(([family, variants]) => ({
      family,
      variants: [...variants.values()].sort(
        (left, right) => variantPeakRate(right) - variantPeakRate(left)
      ),
    }))
    .sort((left, right) => familySortRate(right) - familySortRate(left));
}

export function engineFamilyTotals(
  family: GeoEngineFamily
): GeoEngineFamilyTotals | null {
  return totalsForEngines(engineFamilySources(family));
}

export function engineFamilyModeTotals(
  family: GeoEngineFamily,
  mode: GeoEngineMode
): GeoEngineFamilyTotals | null {
  return totalsForEngines(
    engineFamilySources(family).filter((engine) =>
      mode === "search"
        ? isGroundedEngine(engine.engine)
        : !isGroundedEngine(engine.engine)
    )
  );
}

function totalsForEngines(
  sources: readonly GeoOverviewEngine[]
): GeoEngineFamilyTotals | null {
  if (sources.length === 0) {
    return null;
  }
  const mentions = sources.reduce((sum, engine) => sum + engine.mentions, 0);
  const checks = sources.reduce((sum, engine) => sum + engine.checks, 0);
  return { mentions, checks, rate: checks === 0 ? 0 : mentions / checks };
}

export function buildEngineFamilyModeTrendRows(
  points: readonly GeoTimeseriesPoint[],
  family: string
): EngineFamilyModeTrendRow[] {
  const all = mentionRateSparkline(points, { family, mode: "all" });
  const search = mentionRateSparkline(points, { family, mode: "search" });
  const memory = mentionRateSparkline(points, { family, mode: "memory" });
  const allByDay = new Map(all.map((point) => [point.day, point.value]));
  const searchByDay = new Map(search.map((point) => [point.day, point.value]));
  const memoryByDay = new Map(memory.map((point) => [point.day, point.value]));
  const knownDays = [
    ...new Set([
      ...allByDay.keys(),
      ...searchByDay.keys(),
      ...memoryByDay.keys(),
    ]),
  ].sort();
  const firstDay = knownDays.at(0);
  const lastDay = knownDays.at(-1);
  const days =
    firstDay && lastDay ? listDaysThrough(firstDay, lastDay) : knownDays;

  return days.map((day) => ({
    day: formatDayLabel(day),
    rawDay: day,
    all: allByDay.get(day) ?? null,
    search: searchByDay.get(day) ?? null,
    memory: memoryByDay.get(day) ?? null,
  }));
}

function familySortRate(family: GeoEngineFamily): number {
  return engineFamilyTotals(family)?.rate ?? -1;
}

function emptyFamilyDayBucket(): FamilyDayBucket {
  return {
    mentions: 0,
    checks: 0,
    positionWeighted: 0,
    positionWeight: 0,
  };
}

function addFamilyDayPoint(
  bucket: FamilyDayBucket,
  point: GeoTimeseriesPoint
): void {
  bucket.mentions += point.mentions;
  bucket.checks += point.checks;
  if (point.avgPosition === null || point.avgPosition === undefined) {
    return;
  }
  const weight = point.mentions > 0 ? point.mentions : 1;
  bucket.positionWeighted += point.avgPosition * weight;
  bucket.positionWeight += weight;
}

function familyDayBuckets(
  points: readonly GeoTimeseriesPoint[],
  family?: string
): Map<string, FamilyDayBucket> {
  const byDay = new Map<string, FamilyDayBucket>();
  for (const point of points) {
    if (family && engineFamilyOf(point.engine) !== family) {
      continue;
    }
    const bucket = byDay.get(point.day) ?? emptyFamilyDayBucket();
    addFamilyDayPoint(bucket, point);
    byDay.set(point.day, bucket);
  }
  return byDay;
}

export function mentionOverviewTotals(
  engines: readonly GeoOverviewEngine[]
): GeoEngineFamilyTotals | null {
  return totalsForEngines(engines);
}

const EMPTY_FAMILY_TOTALS: GeoEngineFamilyTotals = {
  mentions: 0,
  checks: 0,
  rate: 0,
};

const EMPTY_OVERVIEW_ENGINE = {
  checks: 0,
  mentions: 0,
  mentionRate: 0,
  avgPosition: null,
  lastCheckedAt: "",
} as const;

export function withTrackedMentionEngines(
  scanned: readonly GeoOverviewEngine[],
  tracked: readonly string[] = []
): GeoOverviewEngine[] {
  const present = new Set(
    scanned.map((engine) => engineFamilyOf(engine.engine))
  );
  const extras: GeoOverviewEngine[] = [];
  for (const engine of tracked) {
    const family = engineFamilyOf(engine);
    if (present.has(family)) {
      continue;
    }
    present.add(family);
    extras.push({ ...EMPTY_OVERVIEW_ENGINE, engine });
  }
  return extras.length === 0 ? [...scanned] : [...scanned, ...extras];
}

function compareMentionProviderRows(
  left: MentionProviderRow,
  right: MentionProviderRow
): number {
  if (right.totals.mentions !== left.totals.mentions) {
    return right.totals.mentions - left.totals.mentions;
  }
  return engineFamilyLabel(left.family.family).localeCompare(
    engineFamilyLabel(right.family.family)
  );
}

export function buildMentionProviderRows(
  scanned: readonly GeoOverviewEngine[],
  options?: {
    trackedEngines?: readonly string[];
    timeseriesPoints?: readonly GeoTimeseriesPoint[];
  }
): MentionProviderRow[] {
  const families = groupEngineFamilies(
    withTrackedMentionEngines(scanned, options?.trackedEngines)
  );
  const points = options?.timeseriesPoints ?? [];
  const trackedFamilies = new Set(
    (options?.trackedEngines ?? []).map((engine) => engineFamilyOf(engine))
  );
  return families
    .map((family) => ({
      family,
      totals: engineFamilyTotals(family) ?? EMPTY_FAMILY_TOTALS,
      mentionDelta: engineFamilyStatTrends(points, family.family).mentionDelta,
      tracked: trackedFamilies.size === 0 || trackedFamilies.has(family.family),
    }))
    .sort(compareMentionProviderRows);
}

function sumFamilyWindow(
  days: readonly string[],
  byDay: ReadonlyMap<string, FamilyDayBucket>
): FamilyDayBucket {
  const total = emptyFamilyDayBucket();
  for (const day of days) {
    const bucket = byDay.get(day);
    if (!bucket) {
      continue;
    }
    total.mentions += bucket.mentions;
    total.checks += bucket.checks;
    total.positionWeighted += bucket.positionWeighted;
    total.positionWeight += bucket.positionWeight;
  }
  return total;
}

function windowRate(bucket: FamilyDayBucket): number | null {
  if (bucket.checks <= 0) {
    return null;
  }
  return bucket.mentions / bucket.checks;
}

function windowPosition(bucket: FamilyDayBucket): number | null {
  if (bucket.positionWeight <= 0) {
    return null;
  }
  return bucket.positionWeighted / bucket.positionWeight;
}

export function mentionCountDelta(
  points: readonly GeoSparklinePoint[],
  today = todayIsoDate()
): number | null {
  const settledPoints = points.filter((point) => point.day < today);
  if (settledPoints.length < GEO_SPARKLINE_MIN_POINTS) {
    return null;
  }
  const midpoint = Math.floor(settledPoints.length / 2);
  const previousTotal = settledPoints
    .slice(0, midpoint)
    .reduce((sum, point) => sum + point.value, 0);
  const currentTotal = settledPoints
    .slice(midpoint)
    .reduce((sum, point) => sum + point.value, 0);
  const previousAverage = previousTotal / midpoint;
  const currentAverage = currentTotal / (settledPoints.length - midpoint);
  return trafficVisitDelta(currentAverage, previousAverage);
}

function splitTrendDays(
  days: readonly string[]
): { previous: string[]; current: string[] } | null {
  if (days.length < GEO_SPARKLINE_MIN_POINTS) {
    return null;
  }
  const mid = Math.floor(days.length / 2);
  return {
    previous: [...days.slice(0, mid)],
    current: [...days.slice(mid)],
  };
}

export function mentionStatTrends(
  points: readonly GeoTimeseriesPoint[],
  options?: { family?: string; today?: string }
): EngineFamilyStatTrends {
  const empty: EngineFamilyStatTrends = {
    ratePts: null,
    mentionDelta: null,
    positionDelta: null,
  };
  const today = options?.today ?? todayIsoDate();
  const byDay = familyDayBuckets(points, options?.family);
  const knownDays = [...byDay.keys()].sort();
  const windows = splitTrendDays(daysWithSettledUsage(knownDays, today));
  if (!windows) {
    return empty;
  }
  const previous = sumFamilyWindow(windows.previous, byDay);
  const current = sumFamilyWindow(windows.current, byDay);
  const previousRate = windowRate(previous);
  const currentRate = windowRate(current);
  const previousPosition = windowPosition(previous);
  const currentPosition = windowPosition(current);
  return {
    ratePts:
      previousRate === null || currentRate === null
        ? null
        : (currentRate - previousRate) * CHART_PERCENT_SCALE,
    mentionDelta: trafficVisitDelta(current.mentions, previous.mentions),
    positionDelta:
      previousPosition === null || currentPosition === null
        ? null
        : currentPosition - previousPosition,
  };
}

export function engineFamilyStatTrends(
  points: readonly GeoTimeseriesPoint[],
  family: string,
  today = todayIsoDate()
): EngineFamilyStatTrends {
  return mentionStatTrends(points, { family, today });
}

export function geoStatDeltaTone(
  delta: number,
  kind: GeoStatDeltaKind
): GeoStatDeltaTone {
  if (isGeoStatDeltaNew(delta)) {
    return "up";
  }
  const rounded =
    kind === "position" ? Math.round(delta * 10) / 10 : Math.round(delta);
  const effective = kind === "position" ? -rounded : rounded;
  if (effective > 0) {
    return "up";
  }
  if (effective < 0) {
    return "down";
  }
  return "flat";
}

export function formatGeoStatDelta(
  delta: number,
  kind: GeoStatDeltaKind
): string {
  if (isGeoStatDeltaNew(delta)) {
    return GEO_STAT_DELTA_NEW_LABEL;
  }
  const tone = geoStatDeltaTone(delta, kind);
  const signed = tone !== "flat";

  if (kind === "mentions") {
    const rounded = Math.round(Math.abs(delta));
    return signed ? `${delta >= 0 ? "+" : "-"}${rounded}%` : `${rounded}%`;
  }
  if (kind === "rate") {
    const rounded = Math.round(delta);
    return signed
      ? `${rounded >= 0 ? "+" : ""}${rounded} pts`
      : `${rounded} pts`;
  }
  const rounded = Math.round(delta * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return signed ? `${rounded > 0 ? "+" : ""}${text}` : text;
}
