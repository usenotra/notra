"use client";

import {
  GEO_AVG_POSITION_LABEL,
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
  GEO_FAMILY_ALL_MODES_LABEL,
  GEO_FAMILY_BRANDS_HINT,
  GEO_FAMILY_BRANDS_LABEL,
  GEO_FAMILY_STAT_TREND_HINT,
  GEO_MENTION_RATE_LABEL,
  GEO_MENTIONS_LABEL,
  GEO_PROMPT_RECEIPT_LABELS,
  GEO_SEARCH_LABEL,
  GEO_SPARKLINE_MIN_POINTS,
  GEO_WITHOUT_SEARCH_LABEL,
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
import { useState } from "react";

import { Button } from "@/components/button";
import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { FamilyImproveCard } from "@/components/geo/family-improve-card";
import { GeoModeIcon } from "@/components/geo/geo-mode-icon";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { ProjectLogo } from "@/components/geo/project-logo";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import { PromptOutcomeIcon } from "@/components/geo/prompt-outcome-icon";
import { WriteDialog } from "@/components/geo/writer/write-dialog";
import { InstrumentSection } from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { CHART_MUTED_COLOR, CHART_PERCENT_SCALE } from "@/constants/charts";
import {
  GEO_PROMPT_DETAIL_SURFACES,
  GEO_WRITE_DIALOG_ENTRIES,
} from "@/constants/geo-analytics";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useEngineFamilySheet } from "@/lib/hooks/use-engine-family-sheet";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types/charts";
import type {
  EngineFamilyBrandRow,
  EngineFamilyBrandScope,
  EngineFamilyPromptHit,
  EngineFamilySheetProps,
} from "@/types/geo";
import { formatFullDayLabel } from "@/utils/analytics-charts";
import {
  geoModeColor,
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
  mentionTrendEmptyLabel,
} from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const FAMILY_TREND_STROKE_WIDTH = 1.5;
// Matches the visibility activity card: the headline series carries the fill
// and a heavier stroke, the comparison lines stay thin.
const FAMILY_TOTAL_STROKE_WIDTH = 2;
const FAMILY_CHART_HEIGHT_CLASS = "h-52 w-full cursor-crosshair";
const FAMILY_SHEET_CONTENT_CLASS =
  "gap-0 overflow-hidden rounded-xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl";
const BRAND_ROW_CLASS =
  "grid h-9 grid-cols-[1.25rem_minmax(0,1fr)_minmax(4rem,7.5rem)_3rem] items-center gap-3 border-b text-sm last:border-b-0";
const RIVAL_BAR_FILL_CLASS = "bg-foreground/25";

const MODE_LABEL: Record<GeoSparklineMode, string> = {
  all: GEO_FAMILY_ALL_MODES_LABEL,
  search: GEO_SEARCH_LABEL,
  memory: GEO_WITHOUT_SEARCH_LABEL,
};

function modeSeriesColors(mode: GeoSparklineMode) {
  if (mode === "search") {
    return seriesColors(geoModeColor("web"));
  }
  if (mode === "memory") {
    return seriesColors(geoModeColor("raw"));
  }
  // Neutral, matching the mode icon: "All" is the baseline the two modes are
  // read against, and it used to share the search colour because the two never
  // appeared on the same chart.
  return seriesColors(CHART_MUTED_COLOR);
}

function Stat({
  label,
  value,
  delta,
  kind,
  hero = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  kind: GeoStatDeltaKind;
  hero?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <p
          className={cn(
            "leading-none font-semibold tracking-tight tabular-nums",
            hero ? "text-3xl" : "text-xl"
          )}
        >
          {value}
        </p>
        <GeoStatDelta
          className="mb-px"
          delta={delta}
          hint={GEO_FAMILY_STAT_TREND_HINT}
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

  return (
    <div className="@container/stats">
      <div className="grid grid-cols-1 items-start gap-4 @min-[22rem]/stats:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Stat
          delta={trends.ratePts}
          hero
          kind="rate"
          label={GEO_MENTION_RATE_LABEL}
          value={totals ? formatMentionRate(totals.rate) : "—"}
        />
        <Stat
          delta={trends.visibilityDelta}
          kind="mentions"
          label={GEO_MENTIONS_LABEL}
          value={totals ? `${totals.visible}/${totals.checks}` : "—"}
        />
        <Stat
          delta={trends.positionDelta}
          kind="position"
          label={GEO_AVG_POSITION_LABEL}
          value={position === null ? "—" : `#${position}`}
        />
      </div>
    </div>
  );
}

function FamilySheetDescription({ family }: { family: GeoEngineFamily }) {
  const lastChecked = engineFamilyLastCheckedAt(family);
  let description =
    family.variants.length > 1
      ? "How each model makes your brand visible"
      : "How this engine makes your brand visible";
  if (lastChecked) {
    description = `Last checked ${formatAiTrafficTimestamp(lastChecked)}`;
  }

  return (
    <SheetDescription className="tabular-nums">{description}</SheetDescription>
  );
}

const TREND_MODES: GeoSparklineMode[] = ["all", "search", "memory"];

function ModeToggle({
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
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-xs transition-opacity",
        "hover:bg-muted/60 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        active ? "opacity-100" : "opacity-40"
      )}
      onClick={onToggle}
      type="button"
    >
      <GeoModeIcon className="size-3" mode={mode} />
      {MODE_LABEL[mode]}
      {totals ? (
        <span className="text-muted-foreground font-normal tabular-nums">
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
  const searchTotals = engineFamilyModeTotals(family, "search");
  const memoryTotals = engineFamilyModeTotals(family, "memory");
  const allTotals = engineFamilyTotals(family);
  const splitModes = searchTotals !== null && memoryTotals !== null;
  const rows = buildEngineFamilyModeTrendRows(points, family.family);
  // A family that only ever answers one way has nothing to compare, so it
  // keeps the single line instead of three copies of it.
  const modeKeys: GeoSparklineMode[] = splitModes ? TREND_MODES : ["all"];
  const [hiddenModes, setHiddenModes] = useState<ReadonlySet<GeoSparklineMode>>(
    () => new Set()
  );
  const visibleModes = modeKeys.filter((mode) => !hiddenModes.has(mode));

  function toggleMode(mode: GeoSparklineMode) {
    setHiddenModes((current) => {
      const next = new Set(current);
      if (next.has(mode)) {
        next.delete(mode);
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
  const totalsByMode: Record<GeoSparklineMode, GeoEngineFamilyTotals | null> = {
    all: allTotals,
    search: searchTotals,
    memory: memoryTotals,
  };
  const config: ChartConfig = Object.fromEntries(
    modeKeys.map((mode) => [
      mode,
      {
        label: `${GEO_MENTION_RATE_LABEL} \u00b7 ${MODE_LABEL[mode]}`,
        colors: modeSeriesColors(mode),
      },
    ])
  );
  const showTrend = rows.length >= GEO_SPARKLINE_MIN_POINTS;
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();

  if (!showTrend) {
    return null;
  }

  return (
    <InstrumentSection
      action={
        splitModes ? (
          <div
            aria-label="Answer mode"
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {modeKeys.map((mode) => (
              <ModeToggle
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
      eyebrow={GEO_MENTION_RATE_LABEL}
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
        <EChartsAreaChart.YAxis tickFormatter={formatChartPercent} />
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
                : FAMILY_TREND_STROKE_WIDTH
            }
            variant={mode === "all" ? "gradient" : "none"}
          >
            <EChartsAreaChart.ActiveDot variant="border" />
          </EChartsAreaChart.Area>
        ))}
        <EChartsAreaChart.Tooltip
          barMax={CHART_PERCENT_SCALE}
          confine={false}
          emptyLabel={(row) => mentionTrendEmptyLabel(row, visibleModes)}
          labelFormatter={formatFullDayLabel}
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
  const muted = row.mentions === 0;
  return (
    <li className={BRAND_ROW_CLASS}>
      <span className="text-muted-foreground text-right text-xs tabular-nums">
        {rank}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        {row.own ? (
          <ProjectLogo
            className="size-4 shrink-0 rounded-sm"
            domain={scope.ownDomain ?? null}
            name={row.name}
          />
        ) : (
          <CompetitorLogo
            className="size-4 shrink-0"
            competitors={scope.competitors}
            name={row.name}
          />
        )}
        <span className={cn("truncate", row.own && "font-medium")}>
          {row.name}
        </span>
        {row.own ? (
          <span className="text-muted-foreground shrink-0 text-xs">(You)</span>
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
  if (rows.length === 0) {
    return null;
  }
  const max = rows.reduce((peak, row) => Math.max(peak, row.share), 0);
  const readout = `${answers.toLocaleString()} answer${answers === 1 ? "" : "s"}`;

  return (
    <InstrumentSection
      eyebrow={GEO_FAMILY_BRANDS_LABEL}
      hint={GEO_FAMILY_BRANDS_HINT}
      readout={readout}
    >
      <ol className="rounded-2xl border px-3">
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

function promptResultLabel(hit: EngineFamilyPromptHit): string {
  if (hit.mentioned && hit.ownedSourceCited) {
    return GEO_PROMPT_RECEIPT_LABELS.mentionedAndCited;
  }
  if (!hit.mentioned && hit.ownedSourceCited) {
    return GEO_PROMPT_RECEIPT_LABELS.cited;
  }
  if (!hit.mentioned) {
    return "Miss";
  }
  return hit.position === null ? "Mentioned" : `#${hit.position}`;
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
  const columns: TableColumn<EngineFamilyPromptHit>[] = [
    {
      key: "prompt",
      header:
        hits.length > 0
          ? `Prompts (${hits.length.toLocaleString()})`
          : "Prompts",
      width: "1fr",
      minWidth: "8rem",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="text-sm">
          {row.prompt}
        </TruncateWithTooltip>
      ),
      sortValue: (row) => row.prompt,
    },
    {
      key: "result",
      header: "Result",
      // Fits "Mentioned and cited" plus the outcome icon and cell padding.
      width: "13rem",
      sortable: true,
      cell: (row) => {
        const visible = row.mentioned || Boolean(row.ownedSourceCited);
        const label = promptResultLabel(row);
        return (
          <span
            className={cn(
              "flex min-w-0 items-center gap-1.5 text-sm tabular-nums",
              !visible && "text-muted-foreground"
            )}
            title={label}
          >
            <PromptOutcomeIcon mentioned={visible} />
            <span className="min-w-0 truncate">{label}</span>
          </span>
        );
      },
      sortValue: (row) => {
        if (row.mentioned) {
          return row.position ?? 0;
        }
        return row.ownedSourceCited
          ? Number.MAX_SAFE_INTEGER - 1
          : Number.MAX_SAFE_INTEGER;
      },
    },
  ];
  if (onWrite) {
    columns.push({
      key: "write",
      header: "",
      width: "5.5rem",
      align: "right",
      cell: (row) =>
        row.mentioned || row.ownedSourceCited ? null : (
          <Button
            className="opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
            onClick={() => onWrite(row)}
            size="sm"
            variant="ghost"
          >
            Write
          </Button>
        ),
    });
  }

  if (hits.length === 0) {
    return null;
  }

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={[...hits]}
      defaultSort={{ key: "result", direction: "asc" }}
      emptyState="No prompts scanned yet"
      getRowId={(row) => row.promptId}
      height={tableHeightFor(hits.length)}
      onRowClick={(row) => onOpen(row.promptId)}
      rowHeight={TABLE_ROW_HEIGHT}
    />
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
    improveInsight,
    gapsHref,
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
          <SheetHeader className="bg-muted/50 border-b pr-14">
            <SheetTitle className="flex items-center gap-2">
              <EngineIcon className="size-5" engine={family.family} />
              {name}
            </SheetTitle>
            <FamilySheetDescription family={family} />
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            <FamilyStats family={family} points={points} />
            <FamilyTrend family={family} points={points} />
            {improveInsight ? (
              <FamilyImproveCard gapsHref={gapsHref} insight={improveInsight} />
            ) : null}
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
