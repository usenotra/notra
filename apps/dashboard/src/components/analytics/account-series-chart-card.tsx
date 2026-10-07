"use client";

import {
  InstrumentEmpty,
  InstrumentModule,
} from "@notra/ui/components/instrument/instrument-module";

import { ChartSeriesLegend } from "@/components/analytics/chart-legend";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import type { AccountSeriesChartCardProps } from "@/types/analytics";

const CHART_CLASS = "h-56 w-full";

export function AccountSeriesChartCard({
  hero = false,
  title,
  description,
  action,
  markIncompleteTail,
  kind,
  rows,
  config,
  allKeys,
  hiddenKeys,
  onToggleSeries,
  markers,
  emptyMessage,
}: AccountSeriesChartCardProps) {
  const seriesKeys = allKeys.filter((key) => !hiddenKeys.has(key));
  // Every day in the selected range is zero-filled by buildAccountSeriesRows,
  // so render the chart whenever an account is selected - a quiet range shows a
  // flat line at zero rather than an empty state.
  const hasData = rows.length > 0 && seriesKeys.length > 0;

  return (
    <InstrumentModule
      action={action}
      description={description}
      eyebrow={title}
      variant="panel"
    >
      {hasData ? (
        <>
          {kind === "area" && (
            <EChartsAreaChart
              className={CHART_CLASS}
              config={config}
              curveType="monotone"
              data={rows}
              enableHoverHighlight
              markers={markers}
              xDataKey="day"
            >
              <EChartsAreaChart.Grid />
              <EChartsAreaChart.XAxis dataKey="day" />
              <EChartsAreaChart.YAxis />
              {seriesKeys.map((key) => (
                <EChartsAreaChart.Area
                  dataKey={key}
                  enableBufferLine={markIncompleteTail}
                  key={key}
                  strokeVariant="solid"
                  variant={hero ? "gradient" : "solid"}
                />
              ))}
              <EChartsAreaChart.Tooltip crosshair />
            </EChartsAreaChart>
          )}
          {kind === "line" && (
            <EChartsLineChart
              className={CHART_CLASS}
              config={config}
              curveType="monotone"
              data={rows}
              enableHoverHighlight
              markers={markers}
              xDataKey="day"
            >
              <EChartsLineChart.Grid />
              <EChartsLineChart.XAxis dataKey="day" />
              <EChartsLineChart.YAxis />
              {seriesKeys.map((key) => (
                <EChartsLineChart.Line
                  dataKey={key}
                  enableBufferLine={markIncompleteTail}
                  glowing={hero}
                  key={key}
                  strokeVariant="solid"
                />
              ))}
              <EChartsLineChart.Tooltip crosshair />
            </EChartsLineChart>
          )}
          {kind === "bar" && (
            <EChartsBarChart
              className={CHART_CLASS}
              config={config}
              data={rows}
              markers={markers}
              stackType="stacked"
              xDataKey="day"
            >
              <EChartsBarChart.Grid />
              <EChartsBarChart.XAxis dataKey="day" />
              <EChartsBarChart.YAxis />
              {seriesKeys.map((key) => (
                <EChartsBarChart.Bar
                  bufferBar={markIncompleteTail}
                  dataKey={key}
                  glowing={hero}
                  key={key}
                />
              ))}
              <EChartsBarChart.Tooltip />
            </EChartsBarChart>
          )}
        </>
      ) : (
        <InstrumentEmpty className="h-56" message={emptyMessage} seed={title} />
      )}
      <ChartSeriesLegend
        config={config}
        hiddenKeys={hiddenKeys}
        onToggle={onToggleSeries}
        orderedKeys={allKeys}
      />
    </InstrumentModule>
  );
}
