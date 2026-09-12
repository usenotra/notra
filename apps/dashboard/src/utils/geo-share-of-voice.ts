import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";

import {
  SHARE_OF_VOICE_AGGREGATE_ID,
  SHARE_OF_VOICE_AGGREGATE_LABEL,
  SHARE_OF_VOICE_RANKING_LIMIT,
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
  isOwnBrandName,
  shareOfVoiceRivalIndex,
  shareOfVoiceSliceColor,
} from "@/utils/geo-competitors";

export function buildShareOfVoiceChartModel({
  points,
  competitors,
  companyName,
  aliases,
  limit = SHARE_OF_VOICE_RANKING_LIMIT,
}: ShareOfVoiceChartProps) {
  const ownBrand = { companyName, aliases };
  const normalizedPoints = points.map((point) => ({
    ...point,
    brand:
      companyName && isOwnBrandName(point.brand, companyName, aliases)
        ? companyName
        : point.brand,
  }));
  const { rows } = buildShareOfVoiceBreakdown(normalizedPoints, {
    competitors,
    companyName,
    aliases,
    limit: points.length,
  });
  const ranked: ShareOfVoiceRankingRow[] = rows.map((row) => ({
    ...row,
    rank:
      row.mentions > 0
        ? rows.filter((entry) => entry.mentions > row.mentions).length + 1
        : null,
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
          rank: null,
        }
      : null);
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
  return { ranking, own, slices, others, other, config, totalMentions };
}
