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
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@notra/ui/components/ui/tabs";
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
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CHART_PERCENT_SCALE, CHART_PRIMARY_COLOR } from "@/constants/charts";
import {
  GEO_PROMPT_DETAIL_SURFACES,
  GEO_WRITE_DIALOG_ENTRIES,
} from "@/constants/geo-analytics";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types/charts";
import type { WriteDialogInitialState } from "@/types/components/geo-writer";
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
import {
  engineFamilyBrandRows,
  findOwnBrandDomain,
} from "@/utils/geo-competitors";
import { familyImproveInsight } from "@/utils/geo-family-improve";
import { geoGapsEngineHref } from "@/utils/geo-paths";
import {
  engineFamilyPromptHits,
  promptTableRowForId,
} from "@/utils/geo-prompts";
import { writeDialogStateFromGap } from "@/utils/geo-write-entry";
import { tableHeightFor } from "@/utils/table";

const FAMILY_TREND_STROKE_WIDTH = 1.5;
const FAMILY_CHART_HEIGHT_CLASS = "h-52 w-full";
const FAMILY_SHEET_CONTENT_CLASS =
  "gap-0 overflow-hidden rounded-xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:border data-[side=right]:sm:max-w-2xl";
const BRAND_ROW_CLASS =
  "grid h-9 grid-cols-[1.25rem_minmax(0,1fr)_minmax(4rem,7.5rem)_3rem] items-center gap-3 border-b text-sm last:border-b-0";
const RIVAL_BAR_FILL_CLASS = "bg-foreground/25";

const MODE_LABEL: Record<GeoSparklineMode, string> = {
  all: GEO_FAMILY_ALL_MODES_LABEL,
  search: GEO_SEARCH_LABEL,
  memory: GEO_WITHOUT_SEARCH_LABEL,
};

function isSparklineMode(value: string): value is GeoSparklineMode {
  return value === "all" || value === "search" || value === "memory";
}

function modeSeriesColors(mode: GeoSparklineMode) {
  if (mode === "search") {
    return seriesColors(geoModeColor("web"));
  }
  if (mode === "memory") {
    return seriesColors(geoModeColor("raw"));
  }
  return seriesColors(CHART_PRIMARY_COLOR);
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
      <div className="flex items-end gap-2">
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
    <div className="grid grid-cols-[1.4fr_1fr_1fr] items-start gap-4">
      <Stat
        delta={trends.ratePts}
        hero
        kind="rate"
        label={GEO_MENTION_RATE_LABEL}
        value={totals ? formatMentionRate(totals.rate) : "—"}
      />
      <Stat
        delta={trends.mentionDelta}
        kind="mentions"
        label={GEO_MENTIONS_LABEL}
        value={totals ? `${totals.mentions}/${totals.checks}` : "—"}
      />
      <Stat
        delta={trends.positionDelta}
        kind="position"
        label={GEO_AVG_POSITION_LABEL}
        value={position === null ? "—" : `#${position}`}
      />
    </div>
  );
}

function FamilySheetDescription({ family }: { family: GeoEngineFamily }) {
  const lastChecked = engineFamilyLastCheckedAt(family);
  let description =
    family.variants.length > 1
      ? "How each model mentions you"
      : "How this engine mentions you";
  if (lastChecked) {
    description = `Last checked ${formatAiTrafficTimestamp(lastChecked)}`;
  }

  return (
    <SheetDescription className="tabular-nums">{description}</SheetDescription>
  );
}

function ModeTab({
  mode,
  totals,
}: {
  mode: GeoSparklineMode;
  totals: GeoEngineFamilyTotals | null;
}) {
  return (
    <TabsTrigger className="h-6 gap-1 px-2 text-xs" value={mode}>
      {mode === "all" ? null : <GeoModeIcon className="size-3" mode={mode} />}
      {MODE_LABEL[mode]}
      {totals ? (
        <span className="text-muted-foreground font-normal tabular-nums">
          {formatMentionRate(totals.rate)}
        </span>
      ) : null}
    </TabsTrigger>
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
  const [mode, setMode] = useState<GeoSparklineMode>("all");
  const rows = buildEngineFamilyModeTrendRows(points, family.family);
  const activeMode: GeoSparklineMode = splitModes ? mode : "all";
  const config: ChartConfig = {
    [activeMode]: {
      label: `${GEO_MENTION_RATE_LABEL} · ${MODE_LABEL[activeMode]}`,
      colors: modeSeriesColors(activeMode),
    },
  };
  const showTrend = rows.length >= GEO_SPARKLINE_MIN_POINTS;
  const markIncompleteTail = rows.at(-1)?.rawDay === todayIsoDate();
  const rowKeys = [activeMode];

  if (!showTrend) {
    return null;
  }

  return (
    <InstrumentSection
      action={
        splitModes ? (
          <Tabs
            onValueChange={(value) => {
              if (typeof value === "string" && isSparklineMode(value)) {
                setMode(value);
              }
            }}
            value={activeMode}
          >
            <TabsList
              aria-label="Answer mode"
              className="h-7 group-data-horizontal/tabs:h-7"
            >
              <ModeTab mode="all" totals={allTotals} />
              <ModeTab mode="search" totals={searchTotals} />
              <ModeTab mode="memory" totals={memoryTotals} />
            </TabsList>
          </Tabs>
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
        key={activeMode}
        xDataKey="day"
      >
        <EChartsAreaChart.Grid variant="dashed" />
        <EChartsAreaChart.XAxis dataKey="day" hideDots />
        <EChartsAreaChart.YAxis hideDots tickFormatter={formatChartPercent} />
        <EChartsAreaChart.Area
          connectNulls
          dataKey={activeMode}
          enableBufferLine={markIncompleteTail}
          gapMissing
          strokeVariant="solid"
          strokeWidth={FAMILY_TREND_STROKE_WIDTH}
          variant="gradient"
        >
          <EChartsAreaChart.ActiveDot variant="border" />
        </EChartsAreaChart.Area>
        <EChartsAreaChart.Tooltip
          barMax={CHART_PERCENT_SCALE}
          confine={false}
          emptyLabel={(row) => mentionTrendEmptyLabel(row, rowKeys)}
          labelFormatter={formatFullDayLabel}
          labelKey="rawDay"
          position="fixed"
          roundness="xl"
          rowKeys={rowKeys}
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
      minWidth: "12rem",
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
      width: "7rem",
      sortable: true,
      cell: (row) => (
        <span
          className={cn(
            "flex items-center gap-1.5 text-sm tabular-nums",
            !row.mentioned && "text-muted-foreground"
          )}
        >
          <PromptOutcomeIcon mentioned={row.mentioned} />
          {promptResultLabel(row)}
        </span>
      ),
      sortValue: (row) =>
        row.mentioned ? (row.position ?? 0) : Number.MAX_SAFE_INTEGER,
    },
  ];
  if (onWrite) {
    columns.push({
      key: "write",
      header: "",
      width: "5.5rem",
      align: "right",
      cell: (row) =>
        row.mentioned ? null : (
          <Button
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
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
}: Omit<EngineFamilySheetProps, "family"> & { family: GeoEngineFamily }) {
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [writeInitial, setWriteInitial] =
    useState<WriteDialogInitialState | null>(null);
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  let organization = null;
  if (organizationSlug && activeOrganization?.slug === organizationSlug) {
    organization = activeOrganization;
  } else if (organizationSlug) {
    organization = getOrganization(organizationSlug);
  }
  const organizationId = organization?.id ?? "";
  const { domain: projectDomain } = useGeoActiveProject(organizationId);
  const ownDomain = projectDomain ?? findOwnBrandDomain(aliases ?? []);
  const canWrite = Boolean(organizationSlug) && Boolean(organizationId);
  const name = engineFamilyLabel(family.family);
  const selectedRow = selectedPromptId
    ? promptTableRowForId(selectedPromptId, promptResults)
    : null;
  const selectedEngine =
    selectedRow?.results.find(
      (result) => engineFamilyOf(result.engine) === family.family
    )?.engine ?? null;
  const promptHits = engineFamilyPromptHits(family.family, promptResults);
  const brandScope: EngineFamilyBrandScope = {
    companyName,
    aliases,
    competitors,
    ownDomain,
  };
  const brandRows = engineFamilyBrandRows(
    family.family,
    promptResults,
    brandScope
  );
  const missedCount = promptHits.filter((hit) => !hit.mentioned).length;
  const improveInsight = familyImproveInsight({
    familyLabel: name,
    search: engineFamilyModeTotals(family, "search"),
    memory: engineFamilyModeTotals(family, "memory"),
    missed: missedCount,
  });
  const gapsHref =
    canWrite && organizationSlug
      ? geoGapsEngineHref(organizationSlug, family.family, projectId)
      : undefined;

  function handleWrite(hit: EngineFamilyPromptHit) {
    setWriteInitial(
      writeDialogStateFromGap({
        promptId: hit.promptId,
        prompt: hit.prompt,
      })
    );
    setWriteOpen(true);
  }

  return (
    <>
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent className={FAMILY_SHEET_CONTENT_CLASS}>
          <SheetHeader className="bg-muted/50 border-b pr-14">
            <SheetTitle className="flex items-center gap-2">
              <EngineIcon className="size-5" engine={family.family} />
              {name}
            </SheetTitle>
            <FamilySheetDescription family={family} />
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            <FamilyStats family={family} points={timeseriesPoints} />
            <FamilyTrend family={family} points={timeseriesPoints} />
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
      </Sheet>
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
  family,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  organizationSlug,
  companyName,
  aliases,
  competitors,
  open,
  onOpenChange,
}: EngineFamilySheetProps) {
  if (!family) {
    return (
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent className={FAMILY_SHEET_CONTENT_CLASS} />
      </Sheet>
    );
  }

  return (
    <EngineFamilySheetSession
      aliases={aliases}
      companyName={companyName}
      competitors={competitors}
      family={family}
      key={family.family}
      onOpenChange={onOpenChange}
      open={open}
      organizationSlug={organizationSlug}
      promptResults={promptResults}
      timeseriesPoints={timeseriesPoints}
    />
  );
}
