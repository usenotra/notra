"use client";

import {
  ArrowUpRight01Icon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  COMPETITOR_PROMPTS_PAGE_TABLE_HEIGHT,
  COMPETITOR_PROMPTS_TABLE_HEIGHT,
  COMPETITORS_TABLE_ROW_HEIGHT,
  GEO_COMPETITOR_DETAIL_CHART_HEIGHT_CLASS,
  GEO_COMPETITOR_DETAIL_MIN_POINTS,
  GEO_COMPETITOR_DETAIL_SERIES_KEY,
} from "@notra/geo-core/constants/geo";
import type {
  GeoCompetitorPromptRow,
  GeoCompetitorPromptSummary,
} from "@notra/geo-core/types/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart";
import { CompetitorEditDialog } from "@/components/geo/competitor-edit-dialog";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import {
  BrandTrackingBadge,
  TrackBrandButton,
} from "@/components/geo/share-of-voice-brand-tag";
import { Table, type TableColumn } from "@/components/motion/table";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { CHART_PRIMARY_COLOR } from "@/constants/charts";
import { GEO_PROMPT_DETAIL_SURFACES } from "@/constants/geo-analytics";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoCompetitorDetail,
  useGeoPromptResults,
  useGeoSettings,
} from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb } from "@/lib/hooks/use-geo-db";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/types/charts";
import type {
  CompetitorDetailViewProps,
  CompetitorPromptAppearancesProps,
  CompetitorSummaryStatsProps,
  GeoCompetitorDetailPoint,
  GeoCompetitorMentionStats,
} from "@/types/geo";
import { seriesColors } from "@/utils/chart-colors";
import { formatEngineFamily } from "@/utils/geo-charts";
import {
  buildGeoCompetitorPoints,
  competitorChartHasIncompleteTail,
  competitorMentionStats,
} from "@/utils/geo-competitor";
import {
  competitorPromptSummary,
  isOwnBrandName,
} from "@/utils/geo-competitors";
import { promptTableRowForId } from "@/utils/geo-prompts";
import { tableHeightFor } from "@/utils/table";

const CHART_CONFIG: ChartConfig = {
  [GEO_COMPETITOR_DETAIL_SERIES_KEY]: {
    label: "Mentions",
    colors: seriesColors(CHART_PRIMARY_COLOR),
  },
};

function CompetitorMentionsChart({
  competitor,
  points,
  incompleteTail,
  showLoading,
  unavailable,
}: {
  competitor: string;
  points: GeoCompetitorDetailPoint[];
  incompleteTail: boolean;
  showLoading: boolean;
  unavailable: boolean;
}) {
  if (unavailable) {
    return (
      <p className="text-muted-foreground text-sm">
        Mentions for {competitor} could not be loaded.
      </p>
    );
  }

  if (showLoading) {
    return (
      <Skeleton
        className={cn("w-full", GEO_COMPETITOR_DETAIL_CHART_HEIGHT_CLASS)}
      />
    );
  }

  if (points.length >= GEO_COMPETITOR_DETAIL_MIN_POINTS) {
    return (
      <EChartsBarChart
        animation={false}
        className={cn("w-full", GEO_COMPETITOR_DETAIL_CHART_HEIGHT_CLASS)}
        config={CHART_CONFIG}
        data={points}
        key={competitor}
        xDataKey="day"
      >
        <EChartsBarChart.Grid />
        <EChartsBarChart.XAxis dataKey="day" />
        <EChartsBarChart.YAxis />
        <EChartsBarChart.Bar
          bufferBar={incompleteTail}
          dataKey={GEO_COMPETITOR_DETAIL_SERIES_KEY}
        />
        <EChartsBarChart.Tooltip />
      </EChartsBarChart>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      Not enough scans yet to chart {competitor}.
    </p>
  );
}

function CompetitorMentionStats({
  stats,
}: {
  stats: GeoCompetitorMentionStats;
}) {
  return (
    <dl className="flex items-baseline gap-4 text-sm tabular-nums">
      <div className="flex items-baseline gap-1.5">
        <dt className="sr-only">Latest on {stats.latestDay}</dt>
        <dd>
          <span className="text-foreground font-semibold">
            {stats.latest.toLocaleString()}
          </span>{" "}
          <span className="text-muted-foreground">{stats.latestDay}</span>
        </dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-muted-foreground">Peak</dt>
        <dd className="text-foreground font-medium">
          {stats.peak.toLocaleString()}
        </dd>
      </div>
    </dl>
  );
}

function CompetitorSummaryStats({
  competitor,
  summary,
  unavailable,
}: CompetitorSummaryStatsProps) {
  const withYouShare =
    summary && summary.answers > 0
      ? Math.round((summary.ownMentioned / summary.answers) * 100)
      : null;
  const missing = unavailable ? "—" : undefined;
  const stats = [
    {
      label: "Answers",
      value: summary?.answers.toLocaleString() ?? missing,
      detail: `latest answers naming ${competitor}`,
    },
    {
      label: "Prompts",
      value: summary?.prompts.toLocaleString() ?? missing,
      detail: "tracked prompts",
    },
    {
      label: "Engines",
      value: summary?.engines.toLocaleString() ?? missing,
      detail: "AI engines",
    },
    {
      label: "With your brand",
      value: summary ? `${withYouShare ?? 0}%` : missing,
      detail: summary
        ? `${summary.ownMentioned.toLocaleString()} of ${summary.answers.toLocaleString()} answers`
        : "",
    },
  ];
  return (
    <dl className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4">
      {stats.map((stat) => (
        <div className="bg-background space-y-1 px-4 py-3" key={stat.label}>
          <dt className="text-muted-foreground text-xs">{stat.label}</dt>
          <dd className="text-xl font-medium tracking-tight tabular-nums">
            {stat.value ?? <Skeleton className="my-1 h-5 w-12" />}
          </dd>
          <dd className="text-muted-foreground truncate text-xs tabular-nums">
            {stat.detail || "\u00a0"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function CompetitorPromptAppearances({
  competitor,
  prompts,
  columns,
  tableHeight,
  showLoading,
  unavailable,
  onRowClick,
}: CompetitorPromptAppearancesProps) {
  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={prompts}
      defaultSort={{ key: "capturedAt", direction: "desc" }}
      emptyState={
        unavailable
          ? "Prompt appearances could not be loaded."
          : `${competitor} has not shown up in your tracked prompts yet.`
      }
      getRowId={(row) => `${row.promptId}-${row.engine}`}
      height={showLoading ? tableHeightFor(3) : tableHeight}
      key={competitor}
      loading={showLoading}
      onRowClick={onRowClick}
      rowHeight={COMPETITORS_TABLE_ROW_HEIGHT}
      toolbar={
        <div className="space-y-0.5 px-4 py-3">
          <h2 className="text-sm font-medium">Where {competitor} shows up</h2>
          <p className="text-muted-foreground text-xs">
            Latest answer per prompt and engine that named {competitor}
          </p>
        </div>
      }
    />
  );
}

export function CompetitorDetailView({
  organizationSlug,
  competitor,
  variant = "modal",
}: CompetitorDetailViewProps) {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_COMPETITOR_DETAIL_VIEWED, {
      surface: variant,
    });
  }, [variant]);

  const { competitors } = useGeoCompetitorsDb(organizationId);
  const { data: settingsData } = useGeoSettings(organizationId);
  const entry =
    competitors.find(
      (item) => item.name.toLowerCase() === competitor.toLowerCase()
    ) ?? null;
  const ownBrand = isOwnBrandName(
    competitor,
    settingsData?.settings?.companyName,
    settingsData?.settings?.aliases
  );
  const discovered = entry === null && !ownBrand;
  const domain = entry?.domain ?? null;
  const [editOpen, setEditOpen] = useState(false);
  const { data, isPending, isError } = useGeoCompetitorDetail(
    organizationId,
    competitor
  );
  const showLoading = !organizationId || (isPending && !data);
  // A failed request leaves `data` undefined with nothing pending — summarising
  // that would read as a competitor with zero answers instead of a failure.
  const unavailable = isError && data === undefined;
  // The answer sheet needs the prompt's full result set; the competitor
  // detail only carries one row per prompt and engine.
  const { data: promptResults } = useGeoPromptResults(organizationId);
  const [selectedAnswer, setSelectedAnswer] = useState<{
    promptId: string;
    engine: string;
  } | null>(null);
  const selectedPromptRow = selectedAnswer
    ? promptTableRowForId(selectedAnswer.promptId, promptResults?.results ?? [])
    : null;
  const points = useMemo(
    () => buildGeoCompetitorPoints(data?.points ?? []),
    [data]
  );
  const stats = useMemo(
    () => (showLoading || unavailable ? null : competitorMentionStats(points)),
    [points, showLoading, unavailable]
  );
  const incompleteTail = competitorChartHasIncompleteTail(points);
  const prompts = data?.prompts ?? [];
  const promptSummary: GeoCompetitorPromptSummary | null =
    showLoading || unavailable ? null : competitorPromptSummary(prompts);

  const columns: TableColumn<GeoCompetitorPromptRow>[] = [
    {
      key: "prompt",
      header: (
        <span className="inline-flex items-center gap-1.5">
          Prompt
          <span className="text-muted-foreground font-normal tabular-nums">
            ({prompts.length.toLocaleString()})
          </span>
        </span>
      ),
      sortable: true,
      width: "1fr",
      cell: (row) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="block w-full min-w-0 truncate">
                {row.prompt}
              </span>
            }
          />
          <TooltipContent className="max-w-sm">{row.prompt}</TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: "engine",
      header: "Engine",
      width: "11rem",
      sortable: true,
      cell: (row) => (
        <span className="inline-flex min-w-0 items-center gap-2">
          <EngineIcon className="size-4 shrink-0" engine={row.engine} />
          <span className="truncate">{formatEngineFamily(row.engine)}</span>
        </span>
      ),
    },
    {
      key: "position",
      header: "Your brand",
      width: "8.5rem",
      sortable: true,
      cell: (row) => {
        if (!row.mentioned) {
          return <span className="text-muted-foreground">Absent</span>;
        }
        return (
          <span className="tabular-nums">
            {row.position === null ? "Mentioned" : `#${row.position}`}
          </span>
        );
      },
      sortValue: (row) => {
        if (!row.mentioned) {
          return Number.MAX_SAFE_INTEGER;
        }
        return row.position ?? Number.MAX_SAFE_INTEGER - 1;
      },
    },
    {
      key: "capturedAt",
      header: "Last seen",
      width: "9.375rem",
      sortable: true,
      cell: (row) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatAiTrafficTimestamp(row.capturedAt)}
        </span>
      ),
    },
  ];

  const tableHeight =
    variant === "page"
      ? COMPETITOR_PROMPTS_PAGE_TABLE_HEIGHT
      : Math.min(
          COMPETITOR_PROMPTS_TABLE_HEIGHT,
          tableHeightFor(prompts.length)
        );

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "flex min-w-0 items-center gap-3",
          variant === "modal" && "pr-10"
        )}
      >
        <CompetitorLogo
          className="size-10 rounded-lg outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
          domain={domain}
          name={competitor}
        />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-lg font-semibold">{competitor}</p>
            {ownBrand ? null : <BrandTrackingBadge tracked={entry !== null} />}
            {discovered ? (
              <TrackBrandButton
                brand={competitor}
                onTrack={() => setEditOpen(true)}
              />
            ) : null}
            {entry ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={`Edit ${competitor}`}
                      className="text-muted-foreground size-7 shrink-0"
                      onClick={() => setEditOpen(true)}
                      size="icon-sm"
                      variant="ghost"
                    />
                  }
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={PencilEdit02Icon}
                    strokeWidth={1.5}
                  />
                </TooltipTrigger>
                <TooltipContent>Edit competitor</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          {domain ? (
            <a
              className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              href={`https://${domain}`}
              rel="noopener"
              target="_blank"
            >
              <span className="underline underline-offset-4">{domain}</span>
              <HugeiconsIcon
                className="opacity-0 transition-opacity group-hover:opacity-100"
                icon={ArrowUpRight01Icon}
                size={12}
              />
            </a>
          ) : (
            <span className="text-muted-foreground text-xs">
              No website yet
            </span>
          )}
        </div>
      </div>

      <CompetitorSummaryStats
        competitor={competitor}
        summary={promptSummary}
        unavailable={unavailable}
      />

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-pretty">
            Mentions over time
          </h2>
          {stats ? <CompetitorMentionStats stats={stats} /> : null}
        </div>
        <CompetitorMentionsChart
          competitor={competitor}
          incompleteTail={incompleteTail}
          points={points}
          showLoading={showLoading}
          unavailable={unavailable}
        />
      </div>

      <CompetitorPromptAppearances
        columns={columns}
        competitor={competitor}
        onRowClick={(row) =>
          setSelectedAnswer({ promptId: row.promptId, engine: row.engine })
        }
        prompts={prompts}
        showLoading={showLoading}
        tableHeight={tableHeight}
        unavailable={unavailable}
      />
      <PromptDetailDialog
        initialEngine={selectedAnswer?.engine ?? null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedAnswer(null);
          }
        }}
        open={selectedPromptRow !== null}
        organizationId={organizationId || undefined}
        row={selectedPromptRow}
        surface={GEO_PROMPT_DETAIL_SURFACES.COMPETITOR_DETAIL}
      />
      {ownBrand ? null : (
        <CompetitorEditDialog
          competitor={entry}
          initialName={competitor}
          onOpenChange={setEditOpen}
          open={editOpen}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
