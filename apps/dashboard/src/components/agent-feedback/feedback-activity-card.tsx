"use client";

import { formatDayLabel, todayIsoDate } from "@notra/geo-core/utils/day-label";
import { InstrumentModule } from "@notra/ui/components/instrument/instrument-module";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useLocale, useTranslations } from "use-intl";

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { CHART_PRIMARY_COLOR } from "@/constants/charts";
import { useAgentFeedbackActivity } from "@/lib/hooks/use-agent-feedback";
import { useGeoRangeDemo } from "@/lib/hooks/use-geo-range-demo";
import type { AgentFeedbackActivityCardProps } from "@/types/agent-feedback";
import type { ChartConfig } from "@/types/charts";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import { seriesColors } from "@/utils/chart-colors";
import { formatChartInteger } from "@/utils/geo-charts";

const FEEDBACK_SERIES_KEY = "feedback";
const FEEDBACK_STROKE_WIDTH = 2;
const Y_AXIS_TICK_COUNT = 4;

/** Whole-number y-axis from zero: counts never get 0.5 ticks. */
function countAxis(peak: number) {
  const interval = Math.max(1, Math.ceil(peak / Y_AXIS_TICK_COUNT));
  return { max: interval * Y_AXIS_TICK_COUNT, interval };
}

/** Feedback received per day in the picked range, styled like the GEO trend. */
export function AgentFeedbackActivityCard({
  organizationId,
}: AgentFeedbackActivityCardProps) {
  const t = useTranslations("feedback.activity");
  const locale = useLocale();
  const geoRange = useGeoRangeDemo();
  const { data, isPending } = useAgentFeedbackActivity(organizationId, {
    from: geoRange.range.dateFrom,
    to: geoRange.range.dateTo,
  });

  if (!organizationId || isPending) {
    return <Skeleton className="h-80 w-full rounded-2xl" />;
  }
  if (!data) {
    return null;
  }

  const config: ChartConfig = {
    [FEEDBACK_SERIES_KEY]: {
      label: t("seriesLabel"),
      colors: seriesColors(CHART_PRIMARY_COLOR),
    },
  };
  const rows = data.points.map((point) => ({
    day: formatDayLabel(point.day, locale),
    rawDay: point.day,
    [FEEDBACK_SERIES_KEY]: point.value,
  }));
  const yAxis = countAxis(
    Math.max(0, ...data.points.map((point) => point.value))
  );
  // Today is still filling up, so the last segment is drawn as a buffer.
  const markIncompleteTail = data.points.at(-1)?.day === todayIsoDate();

  return (
    <InstrumentModule
      bodyClassName="flex min-h-0 flex-1 flex-col px-4 pt-1 pb-4"
      eyebrow={t("title")}
      action={<GeoRangePicker control={geoRange} />}
      variant="table"
    >
      <EChartsAreaChart
        animation={false}
        className="h-64 w-full cursor-crosshair"
        config={config}
        curveType="monotone"
        data={rows}
        xDataKey="day"
      >
        <EChartsAreaChart.Grid variant="solid" />
        <EChartsAreaChart.XAxis dataKey="day" />
        <EChartsAreaChart.YAxis
          interval={yAxis.interval}
          max={yAxis.max}
          min={0}
        />
        <EChartsAreaChart.Area
          dataKey={FEEDBACK_SERIES_KEY}
          enableBufferLine={markIncompleteTail}
          strokeVariant="solid"
          strokeWidth={FEEDBACK_STROKE_WIDTH}
          variant="gradient"
        >
          <EChartsAreaChart.ActiveDot variant="border" />
        </EChartsAreaChart.Area>
        <EChartsAreaChart.Tooltip
          confine={false}
          labelFormatter={(day: string) => formatFullDayLabel(day, locale)}
          labelKey="rawDay"
          layout="activity"
          position="fixed"
          roundness="xl"
          scrub
          valueFormatter={(value: number) => formatChartInteger(value, locale)}
        />
      </EChartsAreaChart>
    </InstrumentModule>
  );
}
