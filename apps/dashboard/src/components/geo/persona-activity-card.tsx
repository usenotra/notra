"use client";

import { formatDayLabel } from "@notra/geo-core/utils/day-label";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import { useState } from "react";

import { EmptyStateTrendPreview } from "@/components/empty-state-preview";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { useIsGeoScanning } from "@/lib/hooks/use-geo";
import { useGeoPersonaActivity } from "@/lib/hooks/use-geo-personas";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import type { ChartConfig } from "@/types/charts";
import type { PersonasTableProps } from "@/types/geo-personas-ui";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import {
  accountSeriesColorPair,
  accountSeriesColors,
} from "@/utils/chart-colors";
import {
  buildPersonaActivityRows,
  buildPersonaActivitySeries,
  personaMentionRate,
  personaForecastKey,
} from "@/utils/persona-activity";

export function PersonaActivityCard({
  organizationId,
  personas,
}: PersonasTableProps) {
  const [hiddenPersonas, setHiddenPersonas] = useState<string[]>([]);
  const hiddenPersonaIds = new Set(hiddenPersonas);
  const range = useGeoRange();
  const { data, isPending, isError, refetch } = useGeoPersonaActivity(
    organizationId,
    range.query
  );
  const isScanning = useIsGeoScanning(organizationId);
  const series = data ? buildPersonaActivitySeries(data, personas) : [];
  const personaIndexes = new Map(
    personas.map((persona, index) => [persona.id, index])
  );
  const config: ChartConfig = {};
  for (const item of series) {
    const colors = accountSeriesColors(personaIndexes.get(item.personaId) ?? 0);
    config[item.dataKey] = { label: item.label, colors };
    if (item.isCurrent) {
      config[personaForecastKey(item.personaId, item.snapshotVersion)] = {
        label: `${item.label} (forecast)`,
        colors,
      };
    }
  }
  const rows = data ? buildPersonaActivityRows(data, series) : [];
  const hasForecast = series.some(
    (item) =>
      item.isCurrent &&
      rows.some(
        (row) =>
          typeof row[
            personaForecastKey(item.personaId, item.snapshotVersion)
          ] === "number"
      )
  );
  const hasResults = data?.points.some(
    (point) =>
      point.checks > 0 &&
      personas.some((persona) => persona.id === point.personaId)
  );
  return (
    <InstrumentModule
      eyebrow="Persona visibility"
      action={<GeoRangePicker control={range} />}
      variant="table"
      bodyClassName="px-4 pb-4 pt-2"
    >
      {isPending ? <Skeleton className="h-64 w-full" /> : null}
      {isError ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm">
          <p>Could not load persona activity.</p>
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => {
              refetch();
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
      {!isPending && !isError && data && hasResults ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-5 pt-3 sm:grid-cols-3 lg:grid-cols-5">
            {personas.map((persona, index) => {
              const currentSeries = series.find(
                (item) => item.personaId === persona.id && item.isCurrent
              );
              const rate = personaMentionRate(
                data,
                persona.id,
                currentSeries?.snapshotVersion
              );
              const color = accountSeriesColorPair(index);
              const visible = !hiddenPersonaIds.has(persona.id);
              return (
                <div className="min-w-0 space-y-1" key={persona.id}>
                  <button
                    type="button"
                    aria-pressed={visible}
                    className="focus-visible:ring-ring flex min-h-6 max-w-full items-center gap-2 rounded-sm text-left text-sm font-medium focus-visible:ring-2 focus-visible:outline-none aria-[pressed=false]:opacity-40"
                    title={persona.name}
                    onClick={() =>
                      setHiddenPersonas((hidden) =>
                        visible
                          ? [...hidden, persona.id]
                          : hidden.filter((id) => id !== persona.id)
                      )
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-sm dark:hidden"
                      style={{ backgroundColor: color.light }}
                    />
                    <span
                      aria-hidden="true"
                      className="hidden size-2 shrink-0 rounded-sm dark:block"
                      style={{ backgroundColor: color.dark }}
                    />
                    <span className="truncate">{persona.name}</span>
                  </button>
                  <p className="text-xl font-semibold tabular-nums">
                    {rate === null ? "—" : `${rate.toFixed(1)}%`}
                  </p>
                </div>
              );
            })}
          </div>
          <EChartsAreaChart
            className="h-72 w-full"
            config={config}
            data={rows}
            xDataKey="day"
            animation={false}
            curveType="monotone"
          >
            <EChartsAreaChart.Grid variant="solid" />
            <EChartsAreaChart.XAxis
              dataKey="day"
              tickFormatter={formatDayLabel}
              hideDots
            />
            <EChartsAreaChart.YAxis
              min={0}
              max={100}
              hideDots
              tickFormatter={(value) => `${value}%`}
            />
            {series.map((item) => (
              <EChartsAreaChart.Area
                key={item.dataKey}
                dataKey={item.dataKey}
                variant={item.isCurrent ? "gradient" : "none"}
                visible={!hiddenPersonaIds.has(item.personaId)}
                strokeVariant={item.isCurrent ? "solid" : "dashed"}
                gapMissing
                strokeWidth={item.isCurrent ? 2 : 1.5}
              >
                <EChartsAreaChart.ActiveDot variant="border" />
              </EChartsAreaChart.Area>
            ))}
            {series
              .filter((item) => item.isCurrent)
              .map((item) => {
                const key = personaForecastKey(
                  item.personaId,
                  item.snapshotVersion
                );
                return (
                  <EChartsAreaChart.Area
                    key={key}
                    dataKey={key}
                    variant="none"
                    visible={!hiddenPersonaIds.has(item.personaId)}
                    strokeVariant="dashed"
                    strokeWidth={1.5}
                    gapMissing
                  >
                    <EChartsAreaChart.ActiveDot variant="border" />
                  </EChartsAreaChart.Area>
                );
              })}
            <EChartsAreaChart.Tooltip
              labelFormatter={formatFullDayLabel}
              valueFormatter={(value) => `${Number(value).toFixed(1)}%`}
            />
          </EChartsAreaChart>
          {hasForecast ? (
            <div className="text-muted-foreground mt-2 flex justify-end gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="bg-border h-px w-5" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="border-border w-5 border-t border-dashed"
                />
                Forecast
              </span>
            </div>
          ) : null}
        </>
      ) : null}
      {!isPending && !isError && !hasResults ? (
        <InstrumentEmpty
          busy={isScanning}
          className="min-h-64"
          message={geoScanEmptyMessage(
            isScanning,
            "Run a scan to see your visibility by persona"
          )}
          preview={<EmptyStateTrendPreview />}
          seed="Persona visibility"
        />
      ) : null}
    </InstrumentModule>
  );
}
