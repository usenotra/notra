"use client";

import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { Badge } from "@notra/ui/components/ui/badge";
import { Card, CardContent } from "@notra/ui/components/ui/card";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useMemo } from "react";
import { useFormatter, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EChartsLineChart } from "@/components/evilcharts/charts/echarts-line-chart";
import { DirectionDelta } from "@/components/geo/directions/direction-delta";
import { PromptResultsTable } from "@/components/geo/directions/prompt-results-table";
import { EngineIcon } from "@/components/geo/engine-icon";
import {
  InstrumentModule,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { CHART_PERCENT_SCALE } from "@/constants/charts";
import {
  GEO_DIRECTIONS_ENGINES,
  GEO_DIRECTIONS_KPIS,
  GEO_DIRECTIONS_LAST_SCAN,
  GEO_DIRECTIONS_NEXT_SCAN_HOURS,
  GEO_DIRECTIONS_SOURCES,
  GEO_DIRECTIONS_TREND_CONFIG,
  GEO_DIRECTIONS_TREND_ROWS,
  GEO_DIRECTIONS_VISIBILITY,
  GEO_DIRECTIONS_VISIBILITY_DELTA,
} from "@/constants/geo-directions";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type {
  GeoDirectionKpi,
  GeoDirectionSourceRow,
} from "@/types/geo-directions";
import { formatChartPercent, formatMentionRate } from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const MAX_SHARE = 1;

function Rail() {
  const t = useTranslations("geo.directions");
  const format = useFormatter();
  const tGeoShared = useTranslations("geo.shared");

  return (
    <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:w-64 lg:self-start">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-sm font-medium">
              {t("labels.aiVisibility")}
            </p>
            <div className="flex items-end gap-2">
              <span className="text-primary text-4xl font-bold tabular-nums">
                {formatMentionRate(GEO_DIRECTIONS_VISIBILITY)}
              </span>
              <DirectionDelta
                className="mb-1"
                delta={GEO_DIRECTIONS_VISIBILITY_DELTA}
              />
            </div>
          </div>

          <div className="divide-border border-border divide-y border-t">
            {GEO_DIRECTIONS_ENGINES.map((engine) => (
              <div
                className="flex items-center gap-2 py-2 text-sm"
                key={engine.engine}
              >
                <EngineIcon engine={engine.engine} />
                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                  {engine.label}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMentionRate(engine.rate)}
                </span>
              </div>
            ))}
          </div>

          <Button className="w-full" size="sm">
            {tGeoShared("runScan")}
          </Button>
          <p className="text-muted-foreground text-xs">
            {t("cockpit.scanSchedule", {
              lastScan: format.dateTime(new Date(GEO_DIRECTIONS_LAST_SCAN), {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              nextScan: format.number(GEO_DIRECTIONS_NEXT_SCAN_HOURS, {
                style: "unit",
                unit: "hour",
              }),
            })}
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function KpiStrip() {
  const t = useTranslations("geo.directions.kpis");
  const tLabels = useTranslations("common.labels");
  const tGeoShared = useTranslations("geo.shared");
  const format = useFormatter();
  const kpiLabels: Record<GeoDirectionKpi["key"], string> = {
    aiVisits: t("aiVisits.label"),
    aiReferrals: tGeoShared("aiReferrals"),
    crawlerHits: t("crawlerHits.label"),
    journeys: tLabels("journeys"),
  };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GEO_DIRECTIONS_KPIS.map((kpi) => (
        <Card key={kpi.key}>
          <CardContent className="flex flex-1 flex-col justify-center gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              {kpiLabels[kpi.key]}
            </p>
            <p className="text-3xl font-bold tabular-nums">
              {format.number(kpi.value)}
            </p>
            <p className="text-muted-foreground text-xs">
              {t(`${kpi.key}.hint`)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SourcesTable() {
  const t = useTranslations("geo.directions");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const format = useFormatter();
  const columns = useMemo<TableColumn<GeoDirectionSourceRow>[]>(
    () => [
      {
        key: "label",
        header: tCommon("labels.source"),
        width: "1fr",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <EngineIcon engine={row.source} />
            <span className="truncate">{row.label}</span>
          </span>
        ),
      },
      {
        key: "kind",
        header: tCommon("labels.type"),
        width: "7rem",
        sortable: true,
        cell: (row) => (
          <Badge className="rounded-sm" variant="outline">
            {row.kind === "referral"
              ? tGeoShared("referral")
              : t(`cockpit.kind.${row.kind}`)}
          </Badge>
        ),
      },
      {
        key: "visits",
        header: tGeoShared("visits"),
        width: "6.5rem",
        sortable: true,
        cell: (row) => (
          <span className="text-sm tabular-nums">
            {format.number(row.visits)}
          </span>
        ),
      },
      {
        key: "share",
        header: tGeoShared("share"),
        width: "6rem",
        sortable: true,
        cell: (row) => (
          <span className="text-sm tabular-nums">
            {formatMentionRate(row.share)}
          </span>
        ),
      },
      {
        key: "weight",
        header: tCommon("labels.weight"),
        width: "1.2fr",
        cell: (row) => <GeoBar max={MAX_SHARE} value={row.share} />,
        sortValue: (row) => row.share,
      },
    ],
    [t, tCommon, tGeoShared, format]
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>
          {tCommon("messages.countPluralOneSourceOther", {
            count: GEO_DIRECTIONS_SOURCES.length,
          })}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={[...GEO_DIRECTIONS_SOURCES]}
        defaultSort={{ key: "visits", direction: "desc" }}
        emptyState={tGeoShared("noAiTrafficCapturedYet")}
        getRowId={(row) => row.source}
        height={tableHeightFor(GEO_DIRECTIONS_SOURCES.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}

export function DirectionCockpit() {
  const t = useTranslations("geo.directions");
  const tGeoShared2 = useTranslations("geo.shared");

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Rail />
      <div className="min-w-0 flex-1 space-y-3">
        <KpiStrip />
        <InstrumentModule
          eyebrow={t("cockpit.trendEyebrow")}
          readout={t("cockpit.trendReadout", {
            search: tGeoShared2("search"),
            withoutSearch: tGeoShared2("wOSearch"),
          })}
        >
          <EChartsLineChart
            animation={false}
            className="h-64 w-full"
            config={{
              grounded: {
                ...GEO_DIRECTIONS_TREND_CONFIG.grounded,
                label: tGeoShared2("search"),
              },
              training: {
                ...GEO_DIRECTIONS_TREND_CONFIG.training,
                label: tGeoShared2("wOSearch"),
              },
            }}
            curveType="monotone"
            data={GEO_DIRECTIONS_TREND_ROWS}
            enableHoverHighlight
            xDataKey="day"
          >
            <EChartsLineChart.Grid />
            <EChartsLineChart.XAxis dataKey="day" />
            <EChartsLineChart.YAxis tickFormatter={formatChartPercent} />
            <EChartsLineChart.Line dataKey="grounded" />
            <EChartsLineChart.Line dataKey="training" />
            <EChartsLineChart.Tooltip
              barMax={CHART_PERCENT_SCALE}
              layout="bars"
              valueFormatter={formatChartPercent}
            />
          </EChartsLineChart>
        </InstrumentModule>
        <InstrumentSection eyebrow={t("cockpit.trafficBySource")}>
          <SourcesTable />
        </InstrumentSection>
        <InstrumentSection
          eyebrow={t("labels.promptResults")}
          readout={t("labels.positionPerEngine")}
        >
          <PromptResultsTable />
        </InstrumentSection>
      </div>
    </div>
  );
}
