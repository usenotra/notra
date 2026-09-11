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
import { chartKey } from "@/utils/chart-keys";
import {
  buildPersonaActivityRows,
  personaMentionRate,
  personaForecastKey,
} from "@/utils/persona-activity";

export function PersonaActivityCard({
  organizationId,
  personas,
}: PersonasTableProps) {
  const [hiddenPersonas, setHiddenPersonas] = useState<string[]>([]);
  const range = useGeoRange();
  const { data, isPending, isError, refetch } = useGeoPersonaActivity(
    organizationId,
    range.query
  );
  const isScanning = useIsGeoScanning(organizationId);
  const config: ChartConfig = {};
  for (const [index, persona] of personas.entries()) {
    config[chartKey(persona.id)] = {
      label: persona.name,
      colors: accountSeriesColors(index),
    };
    config[personaForecastKey(persona.id)] = {
      label: `${persona.name} (forecast)`,
      colors: accountSeriesColors(index),
    };
  }
  const rows = data ? buildPersonaActivityRows(data, personas) : [];
  const hasForecast = Boolean(
    data && rows.some((row) => String(row.day) >= data.to)
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
              const { rate } = personaMentionRate(data, persona.id);
              const color = accountSeriesColorPair(index);
              const visible = !hiddenPersonas.includes(persona.id);
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
            {personas.map((persona) => (
              <EChartsAreaChart.Area
                key={persona.id}
                dataKey={chartKey(persona.id)}
                variant="gradient"
                visible={!hiddenPersonas.includes(persona.id)}
                strokeVariant="solid"
                gapMissing
                strokeWidth={2}
              >
                {data.from === rows.at(-1)?.day ? (
                  <EChartsAreaChart.Dot variant="border" />
                ) : null}
                <EChartsAreaChart.ActiveDot variant="border" />
              </EChartsAreaChart.Area>
            ))}
            {personas.map((persona) => (
              <EChartsAreaChart.Area
                key={personaForecastKey(persona.id)}
                dataKey={personaForecastKey(persona.id)}
                variant="none"
                visible={!hiddenPersonas.includes(persona.id)}
                strokeVariant="dashed"
                strokeWidth={1.5}
                gapMissing
              >
                <EChartsAreaChart.ActiveDot variant="border" />
              </EChartsAreaChart.Area>
            ))}
            <EChartsAreaChart.Tooltip
              labelFormatter={formatFullDayLabel}
              valueFormatter={(value) => `${Number(value).toFixed(1)}%`}
            />
          </EChartsAreaChart>
          {hasForecast ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Dashed lines: 7-day estimate from recent scans. Days without scans
              are shown as 0 and excluded from the estimate.
            </p>
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
