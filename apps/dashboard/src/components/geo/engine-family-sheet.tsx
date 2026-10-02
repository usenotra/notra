"use client";

import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
  GEO_SPARKLINE_MIN_POINTS,
} from "@notra/geo-core/constants/geo";
import type {
  GeoEngineFamily,
  GeoEngineFamilyTotals,
  GeoSparklineMode,
  GeoStatDeltaKind,
  GeoTimeseriesPoint,
} from "@notra/geo-core/types/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { todayIsoDate } from "@notra/geo-core/utils/day-label";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { type CSSProperties, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { ProjectLogo } from "@/components/geo/project-logo";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { PromptOutcomeIcon } from "@/components/geo/prompt-outcome-icon";
import { WriteDialog } from "@/components/geo/writer/write-dialog";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  CHART_PERCENT_SCALE,
  CHART_PRIMARY_COLOR,
  CHART_SECONDARY_COLOR,
} from "@/constants/charts";
import {
  GEO_PROMPT_DETAIL_SURFACES,
  GEO_WRITE_DIALOG_ENTRIES,
} from "@/constants/geo-analytics";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useEngineFamilySheet } from "@/lib/hooks/use-engine-family-sheet";
import { useGeoSparklineModeLabels } from "@/lib/hooks/use-geo-sparkline-mode-labels";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { cn } from "@/lib/utils";
import type { ChartColorPair, ChartConfig } from "@/types/charts";
import type {
  EngineFamilyBrandRow,
  EngineFamilyBrandScope,
  EngineFamilyPromptHit,
  EngineFamilySheetProps,
} from "@/types/geo";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import {
  accountSeriesColorPair,
  geoModeFillClass,
  seriesColors,
} from "@/utils/chart-colors";
import {
  buildEngineFamilyModeTrendRows,
  engineFamilyAvgPosition,
  engineFamilyLastCheckedAt,
  engineFamilyModeTotals,
  engineFamilyStatTrends,
  engineFamilyTotals,
  formatChartPercent,
  formatMentionRate,
  mentionTrendEmptyState,
} from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

// Matches the visibility activity card: the headline series carries the fill
// and a heavier stroke, the comparison lines stay thin.
const FAMILY_TOTAL_STROKE_WIDTH = 2;
const FAMILY_MODE_STROKE_WIDTH = 1.5;
const FAMILY_CHART_HEIGHT_CLASS = "h-52 w-full cursor-crosshair";
const FAMILY_SHEET_CONTENT_CLASS =
  "gap-0 overflow-hidden rounded-xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl";
const BRAND_ROW_CLASS =
  "grid h-11 grid-cols-[1rem_minmax(0,1fr)_minmax(4rem,7.5rem)_2.75rem] items-center gap-3 border-b text-sm last:border-b-0";
const RIVAL_BAR_FILL_CLASS = "bg-foreground/25";

function Stat({
  label,
  value,
  delta,
  kind,
}: {
  label: string;
  value: string;
  delta: number | null;
  kind: GeoStatDeltaKind;
}) {
  const tGeoShared2 = useTranslations("geo.shared");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {/* Fixed height so a stat without a delta keeps the row aligned. */}
      <div className="flex h-5 items-center">
        <GeoStatDelta
          delta={delta}
          hint={tGeoShared2("vsFirstHalfOfThis")}
          kind={kind}
          label={label}
        />
      </div>
    </div>
  );
}

function FamilyStats({
  family,
  points,
}: {
  family: GeoEngineFamily;
  points: readonly GeoTimeseriesPoint[];
}) {
  const totals = engineFamilyTotals(family);
  const position = engineFamilyAvgPosition(family);
  const trends = engineFamilyStatTrends(points, family.family);
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");

  return (
    <div className="@container/stats">
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 @min-[22rem]/stats:grid-cols-3">
        <Stat
          delta={trends.ratePts}
          kind="rate"
          label={tGeoShared("brandVisibility")}
          value={totals ? formatMentionRate(totals.rate) : "—"}
        />
        <Stat
          delta={trends.visibilityDelta}
          kind="mentions"
          label={tCommon("labels.visibility")}
          value={totals ? `${totals.visible}/${totals.checks}` : "—"}
        />
        <Stat
          delta={trends.positionDelta}
          kind="position"
          label={tGeoShared("avgPosition")}
          value={position === null ? "—" : `#${position}`}
        />
      </div>
    </div>
  );
}

function FamilySheetDescription({ family }: { family: GeoEngineFamily }) {
  const t = useTranslations("geo.engineFamilySheet");
  const locale = useLocale();
  const lastChecked = engineFamilyLastCheckedAt(family);
  let description =
    family.variants.length > 1
      ? t("descriptionModels")
      : t("descriptionEngine");
  if (lastChecked) {
    description = t("lastChecked", {
      time: formatAiTrafficTimestamp(lastChecked, locale),
    });
  }

  return (
    <SheetDescription className="tabular-nums">{description}</SheetDescription>
  );
}

const TREND_MODES: GeoSparklineMode[] = ["all", "search", "memory"];

// "All" is the headline series and gets the primary purple every other
// visibility chart uses; the two modes are thinner comparison lines.
const TREND_MODE_COLORS: Record<GeoSparklineMode, ChartColorPair> = {
  all: CHART_PRIMARY_COLOR,
  search: accountSeriesColorPair(0),
  memory: CHART_SECONDARY_COLOR,
};

function TrendLegendItem({
  mode,
  totals,
  active,
  onToggle,
}: {
  mode: GeoSparklineMode;
  totals: GeoEngineFamilyTotals | null;
  active: boolean;
  onToggle: () => void;
}) {
  const modeLabels = useGeoSparklineModeLabels();
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-opacity",
        "hover:bg-muted/60 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        active ? "opacity-100" : "opacity-40"
      )}
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-(--dot-light) dark:bg-(--dot-dark)"
        style={
          {
            "--dot-light": TREND_MODE_COLORS[mode].light,
            "--dot-dark": TREND_MODE_COLORS[mode].dark,
          } as CSSProperties
        }
      />
      {modeLabels[mode]}
      {totals ? (
        <span className="text-muted-foreground tabular-nums">
          {formatMentionRate(totals.rate)}
        </span>
      ) : null}
    </button>
  );
}

function FamilyTrend({
  family,
  points,
}: {
  family: GeoEngineFamily;
  points: readonly GeoTimeseriesPoint[];
}) {
  const t = useTranslations("geo.engineFamilySheet");
  const modeLabels = useGeoSparklineModeLabels();
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const totalsByMode: Record<GeoSparklineMode, GeoEngineFamilyTotals | null> = {
    all: engineFamilyTotals(family),
    search: engineFamilyModeTotals(family, "search"),
    memory: engineFamilyModeTotals(family, "memory"),
  };
  // A family that only ever answers one way has nothing to compare, so it
  // keeps the single line instead of three copies of it.
  const splitModes =
    totalsByMode.search !== null && totalsByMode.memory !== null;
  const modeKeys: GeoSparklineMode[] = splitModes ? TREND_MODES : ["all"];
  const [hiddenModes, setHiddenModes] = useState<ReadonlySet<GeoSparklineMode>>(
    () => new Set()
  );
  const visibleModes = modeKeys.filter((mode) => !hiddenModes.has(mode));
  const rows = buildEngineFamilyModeTrendRows(points, family.family, locale);
  const config: ChartConfig = Object.fromEntries(
    modeKeys.map((mode) => [
      mode,
      {
        label: t("seriesLabel", { mode: modeLabels[mode] }),
        colors: seriesColors(TREND_MODE_COLORS[mode]),
      },
    ])
  );
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();

  function toggleMode(mode: GeoSparklineMode) {
    setHiddenModes((current) => {
      const next = new Set(current);
      if (next.delete(mode)) {
        return next;
      }
      // Emptying the chart tells you nothing, so the last line stays.
      if (modeKeys.length - next.size <= 1) {
        return current;
      }
      next.add(mode);
      return next;
    });
  }

  if (rows.length < GEO_SPARKLINE_MIN_POINTS) {
    return null;
  }

  return (
    <InstrumentSection
      action={
        splitModes ? (
          <div
            aria-label={t("answerMode")}
            className="-mr-1.5 flex flex-wrap items-center gap-1"
          >
            {modeKeys.map((mode) => (
              <TrendLegendItem
                active={!hiddenModes.has(mode)}
                key={mode}
                mode={mode}
                onToggle={() => toggleMode(mode)}
                totals={totalsByMode[mode]}
              />
            ))}
          </div>
        ) : undefined
      }
      eyebrow={t("trend")}
    >
      <EChartsAreaChart
        animation={false}
        className={FAMILY_CHART_HEIGHT_CLASS}
        config={config}
        curveType="monotone"
        data={rows}
        xDataKey="day"
      >
        <EChartsAreaChart.Grid variant="solid" />
        <EChartsAreaChart.XAxis dataKey="day" />
        <EChartsAreaChart.YAxis scale tickFormatter={formatChartPercent} />
        {visibleModes.map((mode) => (
          <EChartsAreaChart.Area
            connectNulls
            dataKey={mode}
            enableBufferLine={markIncompleteTail}
            gapMissing
            key={mode}
            strokeVariant="solid"
            strokeWidth={
              mode === "all"
                ? FAMILY_TOTAL_STROKE_WIDTH
                : FAMILY_MODE_STROKE_WIDTH
            }
            variant="gradient"
          >
            <EChartsAreaChart.ActiveDot variant="border" />
          </EChartsAreaChart.Area>
        ))}
        <EChartsAreaChart.Tooltip
          barMax={CHART_PERCENT_SCALE}
          confine={false}
          emptyLabel={(row) =>
            tGeoShared(mentionTrendEmptyState(row, visibleModes))
          }
          labelFormatter={(day: string) => formatFullDayLabel(day, locale)}
          labelKey="rawDay"
          layout="activity"
          position="fixed"
          roundness="xl"
          rowKeys={visibleModes}
          scrub
          valueFormatter={formatChartPercent}
        />
      </EChartsAreaChart>
    </InstrumentSection>
  );
}

function BrandRow({
  rank,
  row,
  max,
  scope,
}: {
  rank: number;
  row: EngineFamilyBrandRow;
  max: number;
  scope: EngineFamilyBrandScope;
}) {
  const tGeoShared = useTranslations("geo.shared");
  const muted = row.mentions === 0;
  return (
    <li className={BRAND_ROW_CLASS}>
      <span className="text-muted-foreground text-xs tabular-nums">{rank}</span>
      <span className="flex min-w-0 items-center gap-2">
        {row.own ? (
          <ProjectLogo
            className="size-5 shrink-0 rounded-sm"
            domain={scope.ownDomain ?? null}
            name={row.name}
          />
        ) : (
          <CompetitorLogo
            className="size-5 shrink-0"
            competitors={scope.competitors}
            name={row.name}
          />
        )}
        <span className="truncate font-medium">{row.name}</span>
        {row.own ? (
          <span className="text-muted-foreground shrink-0 text-xs">
            {tGeoShared("you")}
          </span>
        ) : null}
      </span>
      <GeoBar
        className="h-1.5"
        fillClassName={row.own ? geoModeFillClass("web") : RIVAL_BAR_FILL_CLASS}
        max={max}
        value={row.share}
      />
      <span
        className={cn(
          "text-right text-xs tabular-nums",
          muted && "text-muted-foreground"
        )}
      >
        {formatMentionRate(row.share)}
      </span>
    </li>
  );
}

function FamilyBrands({
  rows,
  answers,
  scope,
}: {
  rows: readonly EngineFamilyBrandRow[];
  answers: number;
  scope: EngineFamilyBrandScope;
}) {
  const t = useTranslations("geo.engineFamilySheet");
  const tGeoShared = useTranslations("geo.shared");
  if (rows.length === 0) {
    return null;
  }
  const max = rows.reduce((peak, row) => Math.max(peak, row.share), 0);
  const readout = tGeoShared("countPluralOneAnswerOther", { count: answers });

  return (
    <InstrumentSection
      eyebrow={tGeoShared("brandRanking")}
      hint={t("brandsHint")}
      readout={readout}
    >
      <ol>
        {rows.map((row, index) => (
          <BrandRow
            key={row.key}
            max={max}
            rank={index + 1}
            row={row}
            scope={scope}
          />
        ))}
      </ol>
    </InstrumentSection>
  );
}

function PromptHits({
  hits,
  onOpen,
  onWrite,
}: {
  hits: readonly EngineFamilyPromptHit[];
  onOpen: (promptId: string) => void;
  onWrite?: (hit: EngineFamilyPromptHit) => void;
}) {
  const t = useTranslations("geo.engineFamilySheet");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const promptResultLabel = (hit: EngineFamilyPromptHit): string => {
    if (hit.mentioned && hit.ownedSourceCited) {
      return tGeoShared("mentionedAndCited");
    }
    if (!hit.mentioned) {
      return tGeoShared("ownedSourceCited");
    }
    return hit.position === null ? tGeoShared("mentioned") : `#${hit.position}`;
  };
  const missed = hits.filter((hit) => !(hit.mentioned || hit.ownedSourceCited));
  const found = hits.filter((hit) => hit.mentioned || hit.ownedSourceCited);
  // The count lives in the first column header, so each table carries its
  // own title and lines up with its rows.
  const promptColumn = (
    header: string
  ): TableColumn<EngineFamilyPromptHit> => ({
    key: "prompt",
    header,
    width: "1fr",
    minWidth: "8rem",
    cell: (row) => (
      <TruncateWithTooltip className="text-sm">
        {row.prompt}
      </TruncateWithTooltip>
    ),
  });
  const missedColumns: TableColumn<EngineFamilyPromptHit>[] = [
    promptColumn(t("missedTitle", { count: missed.length })),
  ];
  if (onWrite) {
    missedColumns.push({
      key: "write",
      header: "",
      width: "6.5rem",
      align: "right",
      cell: (row) => (
        <Button onClick={() => onWrite(row)} size="sm" variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={PencilEdit01Icon} />
          {tCommon("labels.write")}
        </Button>
      ),
    });
  }
  const foundColumns: TableColumn<EngineFamilyPromptHit>[] = [
    promptColumn(t("foundTitle", { count: found.length })),
    {
      key: "result",
      header: t("resultHeader"),
      // Fits "Mentioned and cited" plus the outcome icon and cell padding.
      width: "13rem",
      sortable: true,
      cell: (row) => {
        const label = promptResultLabel(row);
        return (
          <span
            className="flex min-w-0 items-center gap-1.5 text-sm tabular-nums"
            title={label}
          >
            <PromptOutcomeIcon mentioned />
            <span className="min-w-0 truncate">{label}</span>
          </span>
        );
      },
      // Ranked answers first, then unranked mentions, then citation-only.
      sortValue: (row) => {
        if (row.mentioned) {
          return row.position ?? Number.MAX_SAFE_INTEGER - 1;
        }
        return Number.MAX_SAFE_INTEGER;
      },
    },
  ];

  return (
    <>
      {missed.length > 0 ? (
        <Table
          className="rounded-2xl"
          columns={missedColumns}
          data={missed}
          emptyState={t("emptyPrompts")}
          getRowId={(row) => row.promptId}
          height={tableHeightFor(missed.length)}
          onRowClick={(row) => onOpen(row.promptId)}
          rowHeight={TABLE_ROW_HEIGHT}
        />
      ) : null}
      {found.length > 0 ? (
        <Table
          className="rounded-2xl"
          columns={foundColumns}
          data={found}
          defaultSort={{ key: "result", direction: "asc" }}
          emptyState={t("emptyPrompts")}
          getRowId={(row) => row.promptId}
          height={tableHeightFor(found.length)}
          onRowClick={(row) => onOpen(row.promptId)}
          rowHeight={TABLE_ROW_HEIGHT}
        />
      ) : null}
    </>
  );
}

function EngineFamilySheetSession({
  family,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  organizationSlug,
  companyName,
  aliases,
  competitors,
  open,
  onOpenChange,
  onOpenChangeComplete,
}: Omit<EngineFamilySheetProps, "family"> & {
  family: GeoEngineFamily;
  onOpenChangeComplete: (open: boolean) => void;
}) {
  const {
    timeseriesPoints: points,
    organizationId,
    canWrite,
    name,
    selectedRow,
    selectedEngine,
    promptHits,
    brandScope,
    brandRows,
    writeOpen,
    setWriteOpen,
    writeInitial,
    setSelectedPromptId,
    handleWrite,
  } = useEngineFamilySheet({
    family,
    timeseriesPoints,
    promptResults,
    organizationSlug,
    companyName,
    aliases,
    competitors,
  });

  return (
    <>
      <Sheet
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
        open={open}
      >
        <SheetContent className={FAMILY_SHEET_CONTENT_CLASS}>
          <SheetHeader className="flex-row items-center gap-3 pr-14">
            <span className="bg-shell border-shell-border flex size-10 shrink-0 items-center justify-center rounded-xl border">
              <EngineIcon className="size-5" engine={family.family} />
            </span>
            <div className="min-w-0 space-y-0.5">
              <SheetTitle>{name}</SheetTitle>
              <FamilySheetDescription family={family} />
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-4 pt-2 pb-6">
            <FamilyStats family={family} points={points} />
            <FamilyTrend family={family} points={points} />
            <FamilyBrands
              answers={promptHits.length}
              rows={brandRows}
              scope={brandScope}
            />
            <PromptHits
              hits={promptHits}
              onOpen={setSelectedPromptId}
              onWrite={canWrite ? handleWrite : undefined}
            />
          </div>
        </SheetContent>
        <PromptDetailDialog
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              setSelectedPromptId(null);
            }
          }}
          initialEngine={selectedEngine}
          open={selectedRow !== null}
          organizationId={organizationId || undefined}
          row={selectedRow}
          surface={GEO_PROMPT_DETAIL_SURFACES.ENGINE_SHEET}
        />
      </Sheet>
      {organizationSlug && organizationId ? (
        <WriteDialog
          entry={GEO_WRITE_DIALOG_ENTRIES.ENGINE_SHEET}
          initial={writeInitial}
          onOpenChange={setWriteOpen}
          open={writeOpen}
          organizationId={organizationId}
          organizationSlug={organizationSlug}
        />
      ) : null}
    </>
  );
}

export function EngineFamilySheet({
  family: familyProp,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  organizationSlug,
  companyName,
  aliases,
  competitors,
  open,
  onOpenChange,
}: EngineFamilySheetProps) {
  const [family, releaseFamily] = useRetainedValue(familyProp);
  // A stand-in sheet here would mount, then get replaced once `family` arrives,
  // replaying the slide. The real sheet mounts once, when there is something to show.
  if (!family) {
    return null;
  }

  return (
    <EngineFamilySheetSession
      aliases={aliases}
      companyName={companyName}
      competitors={competitors}
      family={family}
      key={family.family}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={releaseFamily}
      open={open}
      organizationSlug={organizationSlug}
      promptResults={promptResults}
      timeseriesPoints={timeseriesPoints}
    />
  );
}
