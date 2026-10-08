"use client";

import {
  InstrumentEmpty,
  InstrumentModule,
} from "@notra/ui/components/instrument/instrument-module";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { ChartColorScope } from "@/components/charts/chart-color-scope";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import {
  DONUT_CORNER_RADIUS,
  DONUT_INNER_RADIUS,
  DONUT_OUTER_RADIUS,
  DONUT_PADDING_ANGLE,
} from "@/constants/charts";
import { useLeaderboard } from "@/lib/hooks/use-social-analytics";
import type {
  ImpressionsShareCardProps,
  ImpressionsSharePieSlice,
  ImpressionsShareRow,
} from "@/types/analytics";
import type { ChartConfig } from "@/types/charts";
import { accountSeriesKey } from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { chartKey } from "@/utils/chart-keys";

const WINDOW_DAYS = 30;
const PERCENT = 100;

export function ImpressionsShareCard({
  organizationId,
  colorForKey,
}: ImpressionsShareCardProps) {
  const t = useTranslations("analytics.impressionsShare");
  const { data } = useLeaderboard(organizationId, WINDOW_DAYS);

  const { rows, config, total, caption } = useMemo(() => {
    const shareRows = (data?.entries ?? [])
      .filter((entry) => (entry.impressions ?? 0) > 0)
      .map((entry) => ({
        account: `@${entry.username}`,
        impressions: entry.impressions ?? 0,
        seriesKey: accountSeriesKey(entry.provider, entry.providerAccountId),
      }));
    const sliceRows: ImpressionsSharePieSlice[] = shareRows.map(
      (row, index) => ({
        ...row,
        slice: chartKey(`${row.account}-${index}`),
      })
    );
    const shareConfig: ChartConfig = {};
    for (const row of sliceRows) {
      shareConfig[row.slice] = {
        label: row.account,
        colors: seriesColors(colorForKey(row.seriesKey)),
      };
    }
    const shareTotal = sliceRows.reduce((sum, row) => sum + row.impressions, 0);
    const top = sliceRows.reduce<ImpressionsShareRow | null>(
      (best, row) =>
        best === null || row.impressions > best.impressions ? row : best,
      null
    );
    return {
      rows: sliceRows,
      config: shareConfig,
      total: shareTotal,
      caption:
        top && shareTotal > 0
          ? t("caption", {
              account: top.account,
              percent: Math.round((top.impressions / shareTotal) * PERCENT),
            })
          : null,
    };
  }, [colorForKey, data?.entries, t]);

  return (
    <InstrumentModule eyebrow={t("title")} variant="panel">
      {rows.length === 0 ? (
        <InstrumentEmpty
          className="h-56"
          message={t("empty")}
          seed="Impressions share"
        />
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex flex-1 items-center gap-4">
            <EChartsPieChart
              className="h-56 w-1/2 min-w-0"
              config={config}
              data={rows}
              dataKey="impressions"
              nameKey="slice"
            >
              <EChartsPieChart.Pie
                innerRadius={DONUT_INNER_RADIUS}
                outerRadius={DONUT_OUTER_RADIUS}
                cornerRadius={DONUT_CORNER_RADIUS}
                paddingAngle={DONUT_PADDING_ANGLE}
              />
              <EChartsPieChart.Tooltip />
            </EChartsPieChart>
            <ChartColorScope
              className="min-w-0 flex-1 space-y-1.5"
              config={config}
            >
              {rows.map((row) => (
                <div
                  className="flex items-center gap-1.5 font-mono text-xs"
                  key={row.slice}
                >
                  <span
                    className="size-2 shrink-0 rounded-[0.0625rem]"
                    style={{ backgroundColor: `var(--color-${row.slice}-0)` }}
                  />
                  <span className="text-muted-foreground min-w-0 flex-1 truncate">
                    {row.account}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {total > 0
                      ? `${Math.round((row.impressions / total) * PERCENT)}%`
                      : "0%"}
                  </span>
                </div>
              ))}
            </ChartColorScope>
          </div>
          {caption && (
            <p className="text-muted-foreground mt-2 truncate text-[0.6875rem]">
              {caption}
            </p>
          )}
        </div>
      )}
    </InstrumentModule>
  );
}
