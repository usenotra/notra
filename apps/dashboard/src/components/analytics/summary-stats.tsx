"use client";

import { InstrumentGrid } from "@notra/ui/components/instrument/instrument-grid";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import type { AnalyticsStatTile, SummaryStatsProps } from "@/types/analytics";
import {
  buildAnalyticsHeroSummary,
  formatEngagementRate,
  formatMetric,
} from "@/utils/analytics-charts";

export function SummaryStats({
  accounts,
  points,
  rangeHint,
}: SummaryStatsProps) {
  const t = useTranslations("analytics.summary");
  const tCommon = useTranslations("common");
  const tAnalyticsShared = useTranslations("analytics.shared");
  const locale = useLocale();
  const tiles = useMemo<AnalyticsStatTile[]>(() => {
    const summary = buildAnalyticsHeroSummary(accounts, points);
    const notAvailable = tCommon("labels.nA");

    return [
      {
        label: t("engagementRate"),
        value:
          summary.engagementRate === null
            ? notAvailable
            : formatEngagementRate(summary.engagementRate, locale),
        hint: t("engagementHint", {
          interactions: formatMetric(
            summary.interactions,
            locale,
            notAvailable
          ),
          impressions: formatMetric(summary.impressions, locale, notAvailable),
        }),
      },
      {
        label: tAnalyticsShared("followers"),
        value: formatMetric(summary.followers, locale, notAvailable),
        hint: t("followersHint", { count: accounts.length }),
      },
      {
        label: tCommon("labels.impressions"),
        value: formatMetric(summary.impressions, locale, notAvailable),
        hint: t("impressionsHint", { range: rangeHint }),
      },
      {
        label: tAnalyticsShared("interactions"),
        value: formatMetric(summary.interactions, locale, notAvailable),
        hint: t("interactionsHint", { posts: summary.posts, range: rangeHint }),
      },
    ];
  }, [accounts, locale, points, rangeHint, t]);

  return (
    <InstrumentGrid className="grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-1 flex-col justify-center gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              {tile.label}
            </p>
            <p className="text-3xl font-bold tabular-nums">{tile.value}</p>
            <p className="text-muted-foreground truncate text-xs">
              {tile.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </InstrumentGrid>
  );
}
