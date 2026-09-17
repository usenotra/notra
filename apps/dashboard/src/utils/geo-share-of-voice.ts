import { GEO_SPARKLINE_MIN_POINTS } from "@notra/geo-core/constants/geo";
import type {
  GeoSparklinePoint,
  ShareOfVoiceRow,
} from "@notra/geo-core/types/geo";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";

import {
  SHARE_OF_VOICE_AGGREGATE_ID,
  SHARE_OF_VOICE_AGGREGATE_LABEL,
  SHARE_OF_VOICE_RANKING_LIMIT,
  CHART_PERCENT_SCALE,
} from "@/constants/charts";
import type { ChartConfig } from "@/types/charts";
import type {
  ShareOfVoiceChartProps,
  ShareOfVoiceRankingRow,
} from "@/types/geo";
import { seriesColors } from "@/utils/chart-colors";
import {
  buildShareOfVoiceBreakdown,
  toShareOfVoiceDonutSlices,
} from "@/utils/geo-charts";
import {
  buildShareOfVoiceMentionSparklines,
  isOwnBrandName,
  shareOfVoiceRivalIndex,
  shareOfVoiceSliceColor,
} from "@/utils/geo-competitors";

/** A brand without mentions ranks behind every brand that has some. */
function shareOfVoiceRank(
  mentions: number,
  rows: readonly { mentions: number }[]
): number {
  if (mentions > 0) {
    return rows.filter((entry) => entry.mentions > mentions).length + 1;
  }
  return rows.filter((entry) => entry.mentions > 0).length + 1;
}

function sumWindow(
  series: readonly GeoSparklinePoint[],
  days: ReadonlySet<string>
): number {
  let total = 0;
  for (const point of series) {
    if (days.has(point.day)) {
      total += point.value;
    }
  }
  return total;
}

/**
 * Own share (in points) and rank compared between the second and the first
 * half of the settled days in range, matching `mentionCountDelta`. Works on
 * daily mention counts, not on the daily share fractions in `row.trend`.
 */
export function shareOfVoiceOwnTrends(
  rows: readonly ShareOfVoiceRow[],
  own: ShareOfVoiceRow | null,
  mentionSparklines: ReadonlyMap<string, GeoSparklinePoint[]>,
  today = todayIsoDate()
): { shareDelta: number | null; rankDelta: number | null } {
  const empty = { shareDelta: null, rankDelta: null };
  if (!own) {
    return empty;
  }
  const seriesOf = (row: ShareOfVoiceRow) =>
    mentionSparklines.get(row.id) ?? [];
  const days = [
    ...new Set(rows.flatMap((row) => seriesOf(row).map((point) => point.day))),
  ]
    .filter((day) => day < today)
    .sort();
  if (days.length < GEO_SPARKLINE_MIN_POINTS) {
    return empty;
  }
  const mid = Math.floor(days.length / 2);
  const previousDays = new Set(days.slice(0, mid));
  const currentDays = new Set(days.slice(mid));
  const windowOf = (window: ReadonlySet<string>) => {
    const totals = rows.map((row) => ({
      id: row.id,
      mentions: sumWindow(seriesOf(row), window),
    }));
    const total = totals.reduce((sum, row) => sum + row.mentions, 0);
    const ownMentions = sumWindow(seriesOf(own), window);
    return {
      ownMentions,
      share: total > 0 ? ownMentions / total : null,
      rank: total > 0 ? shareOfVoiceRank(ownMentions, totals) : null,
    };
  };
  const previous = windowOf(previousDays);
  const current = windowOf(currentDays);
  if (previous.ownMentions === 0 && current.ownMentions === 0) {
    return empty;
  }
  return {
    shareDelta:
      previous.share === null || current.share === null
        ? null
        : (current.share - previous.share) * CHART_PERCENT_SCALE,
    rankDelta:
      previous.rank === null || current.rank === null
        ? null
        : current.rank - previous.rank,
  };
}

export function buildShareOfVoiceChartModel({
  points,
  timeseries = [],
  competitors,
  companyName,
  aliases,
  limit = SHARE_OF_VOICE_RANKING_LIMIT,
}: ShareOfVoiceChartProps) {
  const ownBrand = { companyName, aliases };
  // Mentions under an own-brand alias count for the company name, both in
  // the totals and in the daily series behind the change indicators.
  const normalizeBrand = (brand: string) =>
    companyName && isOwnBrandName(brand, companyName, aliases)
      ? companyName
      : brand;
  const normalizedPoints = points.map((point) => ({
    ...point,
    brand: normalizeBrand(point.brand),
  }));
  const normalizedTimeseries = timeseries.map((point) => ({
    ...point,
    brand: normalizeBrand(point.brand),
  }));
  const { rows } = buildShareOfVoiceBreakdown(normalizedPoints, {
    competitors,
    companyName,
    aliases,
    limit: points.length,
  });
  const ranked: ShareOfVoiceRankingRow[] = rows.map((row) => ({
    ...row,
    rank: shareOfVoiceRank(row.mentions, rows),
    own: isOwnBrandName(row.brand, companyName, aliases),
  }));
  const own: ShareOfVoiceRankingRow | null =
    ranked.find((row) => row.own) ??
    (companyName
      ? {
          id: `brand:${companyName}`,
          kind: "brand",
          brand: companyName,
          mentions: 0,
          share: 0,
          trend: [],
          tracked: true,
          own: true,
          rank: shareOfVoiceRank(0, rows),
        }
      : null);
  const brandCount = ranked.some((row) => row.own)
    ? ranked.length
    : ranked.length + (own ? 1 : 0);
  const leaders = ranked.slice(0, limit);
  const ranking =
    own && !leaders.some((row) => row.own) ? [...leaders, own] : leaders;
  const displayed = new Set(ranking.map((row) => row.id));
  const others = rows.filter((row) => !displayed.has(row.id));
  const totalMentions = rows.reduce((sum, row) => sum + row.mentions, 0);
  const otherMentions = others.reduce((sum, row) => sum + row.mentions, 0);
  const other: ShareOfVoiceRow | null =
    otherMentions > 0
      ? {
          id: SHARE_OF_VOICE_AGGREGATE_ID,
          kind: "aggregate",
          brand: SHARE_OF_VOICE_AGGREGATE_LABEL,
          mentions: otherMentions,
          share: totalMentions > 0 ? otherMentions / totalMentions : 0,
          trend: [],
          tracked: false,
        }
      : null;
  // Daily mentions per brand; the aggregate sums every brand outside the
  // displayed ranking, so it is built against the ranking rather than all rows.
  const mentionSparklines = buildShareOfVoiceMentionSparklines(
    normalizedTimeseries,
    rows,
    competitors
  );
  if (other) {
    const aggregateSeries = buildShareOfVoiceMentionSparklines(
      normalizedTimeseries,
      [...ranking, other],
      competitors
    ).get(other.id);
    if (aggregateSeries) {
      mentionSparklines.set(other.id, aggregateSeries);
    }
  }
  const ownTrends = shareOfVoiceOwnTrends(rows, own, mentionSparklines);
  const slices = toShareOfVoiceDonutSlices(
    other ? [...ranking, other] : ranking
  );
  const config: ChartConfig = {};
  for (const row of slices) {
    config[row.slice] = {
      label: row.brand,
      colors: seriesColors(
        shareOfVoiceSliceColor(
          row,
          shareOfVoiceRivalIndex(slices, row.brand, ownBrand),
          competitors,
          ownBrand
        )
      ),
    };
  }
  return {
    ranking,
    own,
    slices,
    others,
    other,
    config,
    totalMentions,
    brandCount,
    mentionSparklines,
    ...ownTrends,
  };
}
