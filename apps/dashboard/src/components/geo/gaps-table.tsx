"use client";

import { RefreshIcon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_COMPETITOR_KIND_DETAIL,
  GEO_GAPS_COMPETITOR_DETAIL,
  GEO_GAPS_EMPTY,
  GEO_GAPS_EMPTY_CELL,
  GEO_GAPS_ENGINE_FILTER_ALL,
  GEO_GAPS_METER_STEPS,
  GEO_GAPS_METER_TONE_CLASS,
  GEO_GAPS_TABLE_HEIGHT,
  GEO_GAPS_WON_DETAIL,
  GEO_GAPS_WON_LABEL,
  GEO_PROMPTS_NAV_LINK,
  GEO_RESCAN_LABEL,
  GEO_RESCAN_TOOLTIP,
  GEO_SEARCH_GAP_ACTION_CLASS,
  GEO_SEARCH_GAP_ACTION_LABELS,
  GEO_SEARCH_GAP_WRITE_LABELS,
} from "@notra/geo-core/constants/geo";
import { findCompetitor } from "@notra/geo-core/geo/domain";
import type {
  GeoPromptGapRow,
  GeoSearchGapRow,
} from "@notra/geo-core/types/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { Badge } from "@notra/ui/components/ui/badge";
import { Input } from "@notra/ui/components/ui/input";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GapDetailDialog } from "@/components/geo/gap-detail-dialog";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type {
  GeoGapBrandMentionsCellProps,
  GeoGapDetailSelection,
  GeoGapContentCellProps,
  GeoGapMeterProps,
  GeoGapNumberCellProps,
  GeoGapOpportunityCellProps,
  GeoGapQueriesCellProps,
  GeoGapRecommendationCellProps,
  GeoGapSearchWriteCellProps,
  GeoGapsWriteCellProps,
  GeoGapsEmptyProps,
  GeoGapsFiltersProps,
  GeoGapsTab,
  GeoGapsTableProps,
  GeoGapsTabsProps,
  GeoGapVisibleOnCellProps,
} from "@/types/components/geo-gaps";
import { formatMentionRate } from "@/utils/geo-charts";
import {
  filterPromptGaps,
  filterSearchGaps,
  gapCanRescan,
  gapMeterLevel,
  gapMeterTone,
  gapMissingEngineFamilies,
  gapOpportunityDetail,
  gapVisibleOnLabel,
  gapWriteAction,
  gapWriteLabel,
  geoGapsEmptyKind,
  searchGapActionOrder,
  searchGapWriteLabel,
  uniqueGapEngineFamilies,
} from "@/utils/geo-gaps";
import { withGeoProject } from "@/utils/geo-paths";

function remainingTableHeight(element: HTMLElement): number {
  const elementTop = element.getBoundingClientRect().top;
  const page = element.closest("[data-geo-gaps-page]");
  const pagePadding =
    page instanceof HTMLElement
      ? Number.parseFloat(getComputedStyle(page).paddingBottom)
      : Number.NaN;
  const inset = Number.isFinite(pagePadding) ? pagePadding : 24;

  let pageAvailable = 0;
  if (page instanceof HTMLElement) {
    pageAvailable = page.getBoundingClientRect().bottom - inset - elementTop;
  }

  let scrollAvailable = 0;
  let parent: HTMLElement | null = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      scrollAvailable =
        parent.getBoundingClientRect().bottom - inset - elementTop;
      break;
    }
    parent = parent.parentElement;
  }

  return Math.max(element.clientHeight, pageAvailable, scrollAvailable);
}

function useFillHeight(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const next = Math.floor(remainingTableHeight(element));
      if (next > 0) {
        setHeight((current) => (current === next ? current : next));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const page = element.closest("[data-geo-gaps-page]");
    if (page instanceof HTMLElement) {
      observer.observe(page);
    }
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return [ref, height] as const;
}

function WriteCell({
  action,
  postId,
  sourceKind,
  opportunityBucket,
  onOpenPost,
  onWrite,
  onRescan,
  rescanDisabled = false,
}: GeoGapsWriteCellProps) {
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {onRescan ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={GEO_RESCAN_LABEL}
                disabled={rescanDisabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onRescan();
                }}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <HugeiconsIcon icon={RefreshIcon} size={15} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {GEO_RESCAN_TOOLTIP}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <Button
        onClick={(event) => {
          event.stopPropagation();
          trackEvent(POSTHOG_EVENTS.GEO_GAP_WRITE_CLICKED, {
            source_kind: sourceKind,
            action,
            has_existing_post: Boolean(postId),
            opportunity_bucket: opportunityBucket,
          });
          if (
            (action === "open" ||
              action === "review" ||
              action === "writing") &&
            postId
          ) {
            onOpenPost(postId);
            return;
          }
          onWrite();
        }}
        size="sm"
        variant={action === "write" ? "default" : "outline"}
      >
        {gapWriteLabel(action)}
      </Button>
    </span>
  );
}

function RecommendationCell({ recommendation }: GeoGapRecommendationCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            className={cn(
              "cursor-default font-normal",
              GEO_SEARCH_GAP_ACTION_CLASS[recommendation.action]
            )}
            variant="outline"
          />
        }
      >
        {GEO_SEARCH_GAP_ACTION_LABELS[recommendation.action]}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <span className="flex flex-col gap-1.5">
          <span>{recommendation.reason}</span>
          {recommendation.targets.length > 0 ? (
            <span className="flex flex-col gap-0.5">
              {recommendation.targets.map((target) => (
                <span
                  className="flex items-center justify-between gap-3"
                  key={`${target.kind}:${target.id}`}
                >
                  {target.url ? (
                    <a
                      className="truncate underline underline-offset-2"
                      href={target.url}
                      rel="noopener"
                      target="_blank"
                    >
                      {target.title}
                    </a>
                  ) : (
                    <span className="truncate">{target.title}</span>
                  )}
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {Math.round(target.score * 100)}%
                  </span>
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function SearchWriteCell({
  row,
  isDismissing,
  onOpenPost,
  onWrite,
  onDismiss,
}: GeoGapSearchWriteCellProps) {
  const briefAction = gapWriteAction(row.brief);
  if (briefAction !== "write") {
    return (
      <WriteCell
        action={briefAction}
        onOpenPost={onOpenPost}
        onWrite={() => onWrite()}
        opportunityBucket={null}
        postId={row.brief?.postId}
        sourceKind="search_console"
      />
    );
  }
  const { action, targets } = row.recommendation;
  const topTargetUrl = targets[0]?.url ?? undefined;
  if (action === "ignore") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Button
          disabled={isDismissing}
          onClick={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
          size="sm"
          variant="ghost"
        >
          {isDismissing ? <StatusSpinner /> : null}
          {GEO_SEARCH_GAP_WRITE_LABELS.dismiss}
        </Button>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onWrite();
          }}
          size="sm"
          variant="outline"
        >
          {searchGapWriteLabel(action)}
        </Button>
      </span>
    );
  }
  return (
    <Button
      onClick={(event) => {
        event.stopPropagation();
        onWrite(action === "create" ? undefined : topTargetUrl);
      }}
      size="sm"
    >
      {searchGapWriteLabel(action)}
    </Button>
  );
}

function GapMeter({ level, label }: GeoGapMeterProps) {
  const filledClass = GEO_GAPS_METER_TONE_CLASS[gapMeterTone(level)];
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={label}
            className="inline-flex h-4 cursor-default items-center gap-2"
          />
        }
      >
        <span className="inline-flex h-4 items-end gap-1">
          {Array.from({ length: GEO_GAPS_METER_STEPS }, (_, index) => (
            <span
              className={cn(
                "w-1.5 rounded-[0.0625rem]",
                index < level ? cn("h-4", filledClass) : "bg-muted h-2.5"
              )}
              key={index}
            />
          ))}
        </span>
        <span className="text-xs tabular-nums">
          {level}/{GEO_GAPS_METER_STEPS}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function OpportunityCell({ row, maxOpportunity }: GeoGapOpportunityCellProps) {
  if (row.won) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex cursor-default" />}
        >
          <Badge className="text-geo-up font-normal" variant="outline">
            {GEO_GAPS_WON_LABEL}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {GEO_GAPS_WON_DETAIL}
        </TooltipContent>
      </Tooltip>
    );
  }
  const intensity = maxOpportunity <= 0 ? 0 : row.opportunity / maxOpportunity;
  const level = gapMeterLevel(intensity);
  return (
    <GapMeter
      label={`${level}/${GEO_GAPS_METER_STEPS} opportunity · ${formatMentionRate(row.ownMentionRate)} mention rate · ${gapOpportunityDetail(row)}`}
      level={level}
    />
  );
}

function ContentCell({ title, subtitle }: GeoGapContentCellProps) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span
        className="line-clamp-2 text-sm leading-snug font-medium"
        title={title}
      >
        {title}
      </span>
      {subtitle ? (
        <span
          className="text-muted-foreground line-clamp-2 text-xs"
          title={subtitle}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

function VisibleOnCell({
  mentionedEngines,
  missingEngines,
}: GeoGapVisibleOnCellProps) {
  const visible = gapMissingEngineFamilies(mentionedEngines);
  const missing = gapMissingEngineFamilies(missingEngines);
  if (visible.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="text-muted-foreground cursor-default text-xs" />
          }
        >
          {GEO_GAPS_EMPTY_CELL.visibleOn}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Missing on{" "}
          {missing.map((family) => engineFamilyLabel(family)).join(", ")}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs tabular-nums">
        {gapVisibleOnLabel(mentionedEngines, missingEngines)}
      </span>
      <LogoStack
        items={visible.map((family) => ({
          key: family,
          label: engineFamilyLabel(family),
          detail: "Mentions you",
          renderIcon: (className) => (
            <EngineIcon className={className} engine={family} />
          ),
        }))}
      />
    </span>
  );
}

function QueriesCell({ prompt, queries }: GeoGapQueriesCellProps) {
  if (queries.length === 0) {
    return <ContentCell subtitle={null} title={prompt} />;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="flex min-w-0 cursor-default flex-col" />}
      >
        <ContentCell
          subtitle={`${queries.length} ${queries.length === 1 ? "search query" : "search queries"}`}
          title={prompt}
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        <span className="flex flex-col gap-1">
          {queries.map((keyword) => (
            <span className="flex justify-between gap-3" key={keyword.query}>
              <span className="truncate">{keyword.query}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {keyword.impressions.toLocaleString()} impr · #
                {keyword.position.toFixed(1)}
              </span>
            </span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

function NumberCell({ value, emptyLabel, format }: GeoGapNumberCellProps) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">{emptyLabel}</span>;
  }
  return (
    <span className="tabular-nums">
      {format ? format(value) : value.toLocaleString()}
    </span>
  );
}

function GapsEmpty({
  kind,
  isScanning,
  organizationSlug,
  onRunScan,
}: GeoGapsEmptyProps) {
  const { projectId } = useGeoProjectScope();
  const copy = GEO_GAPS_EMPTY[kind];
  let action = null;
  if (kind === "no-scan") {
    action = (
      <Button disabled={isScanning} onClick={onRunScan}>
        {isScanning ? <StatusSpinner /> : null}
        {GEO_GAPS_EMPTY["no-scan"].action}
      </Button>
    );
  } else if (kind === "no-search-gaps") {
    action = (
      <Button
        nativeButton={false}
        render={
          <Link
            href={withGeoProject(
              `/${organizationSlug}${GEO_PROMPTS_NAV_LINK}`,
              projectId
            )}
          />
        }
      >
        {GEO_GAPS_EMPTY["no-search-gaps"].action}
      </Button>
    );
  }

  return (
    <EmptyState
      action={action}
      description={copy.description}
      preview={
        <EmptyStateTablePreview
          columns={EMPTY_STATE_TABLE_COLUMNS.gaps}
          rows={EMPTY_STATE_TABLE_ROWS}
        />
      }
      title={copy.title}
    />
  );
}

function GapsTabs({
  tab,
  onTabChange,
  promptCount,
  searchCount,
}: GeoGapsTabsProps) {
  return (
    <PermissionRow
      className="w-fit shrink-0"
      label="Gap type"
      layout="compact"
      onValueChange={(value) => {
        if (value === "prompt" || value === "search") {
          onTabChange(value);
        }
      }}
      value={tab}
    >
      <PermissionOption value="prompt">
        Prompt Gaps
        <span className="text-xs tabular-nums opacity-70">
          {promptCount.toLocaleString()}
        </span>
      </PermissionOption>
      <PermissionOption value="search">
        Search Gaps
        <span className="text-xs tabular-nums opacity-70">
          {searchCount.toLocaleString()}
        </span>
      </PermissionOption>
    </PermissionRow>
  );
}

function GapsFilters({
  query,
  onQueryChange,
  engine,
  onEngineChange,
  engineFamilies,
}: GeoGapsFiltersProps) {
  const showEngineFilter =
    engineFamilies.length > 0 || engine !== GEO_GAPS_ENGINE_FILTER_ALL;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-72">
        <HugeiconsIcon
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          icon={SearchIcon}
          size={15}
        />
        <Input
          aria-label="Filter content gaps"
          className="pl-9"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter gaps..."
          value={query}
        />
      </div>
      {showEngineFilter ? (
        <Select
          onValueChange={(value) =>
            onEngineChange(value ?? GEO_GAPS_ENGINE_FILTER_ALL)
          }
          value={engine}
        >
          <SelectTrigger aria-label="Filter by missing engine" className="w-44">
            <SelectValue>
              {engine === GEO_GAPS_ENGINE_FILTER_ALL
                ? "All engines"
                : engineFamilyLabel(engine)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-56">
            <SelectItem value={GEO_GAPS_ENGINE_FILTER_ALL}>
              All engines
            </SelectItem>
            {engineFamilies.map((family) => (
              <SelectItem key={family} value={family}>
                <span className="flex items-center gap-2">
                  <EngineIcon className="size-3.5" engine={family} />
                  {engineFamilyLabel(family)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

function BrandMentionsCell({
  competitors,
  tracked,
  discovered,
}: GeoGapBrandMentionsCellProps) {
  const trackedItems = tracked.map((name) => {
    const competitor = findCompetitor(competitors, name);
    return {
      key: `tracked:${name}`,
      label: name,
      detail: competitor
        ? `${GEO_GAPS_COMPETITOR_DETAIL.tracked} · ${GEO_COMPETITOR_KIND_DETAIL[competitor.kind]}`
        : GEO_GAPS_COMPETITOR_DETAIL.tracked,
      renderIcon: (className: string) => (
        <CompetitorLogo
          className={className}
          domain={competitor?.domain ?? null}
          name={name}
        />
      ),
    };
  });
  const discoveredItems = discovered.map((name) => ({
    key: `discovered:${name}`,
    label: name,
    detail: GEO_GAPS_COMPETITOR_DETAIL.discovered,
    renderIcon: (className: string) => (
      <CompetitorLogo className={className} domain={null} name={name} />
    ),
  }));
  return (
    <LogoStack
      emptyLabel={GEO_GAPS_EMPTY_CELL.competitors}
      items={[...trackedItems, ...discoveredItems]}
    />
  );
}

export function GeoGapsTable({
  promptGaps,
  searchGaps,
  competitors,
  hasScanData,
  isScanning,
  organizationSlug,
  onRunScan,
  onWritePrompt,
  onWriteSearch,
  onDismissSearch,
  dismissingSearchId,
  onRescanPrompt,
  onOpenPost,
}: GeoGapsTableProps) {
  const [tab, setTab] = useState<GeoGapsTab>("prompt");
  const [detail, setDetail] = useState<GeoGapDetailSelection | null>(null);
  const selectedSearch =
    detail?.kind === "search"
      ? (searchGaps.find((row) => row.id === detail.id) ?? null)
      : null;
  const [query, setQuery] = useQueryState(
    "q",
    parseAsString.withDefault("").withOptions({ clearOnDefault: true })
  );
  const [engine, setEngine] = useQueryState(
    "engine",
    parseAsString
      .withDefault(GEO_GAPS_ENGINE_FILTER_ALL)
      .withOptions({ clearOnDefault: true })
  );
  const maxOpportunity = useMemo(
    () => Math.max(0, ...promptGaps.map((row) => row.opportunity)),
    [promptGaps]
  );
  const engineFamilies = useMemo(() => {
    const families = uniqueGapEngineFamilies(promptGaps);
    if (engine !== GEO_GAPS_ENGINE_FILTER_ALL && !families.includes(engine)) {
      return [engine, ...families];
    }
    return families;
  }, [engine, promptGaps]);
  const filteredPromptGaps = useMemo(
    () => filterPromptGaps(promptGaps, query, engine),
    [engine, promptGaps, query]
  );
  const filteredSearchGaps = useMemo(
    () => filterSearchGaps(searchGaps, query),
    [query, searchGaps]
  );

  const promptColumns: TableColumn<GeoPromptGapRow>[] = [
    {
      key: "prompt",
      header: "Prompt",
      width: "1fr",
      cell: (row) => {
        const headline = row.brief?.workingTitle ?? row.title;
        return <ContentCell subtitle={null} title={headline ?? row.prompt} />;
      },
      sortValue: (row) => row.brief?.workingTitle ?? row.title ?? row.prompt,
      sortable: true,
    },
    {
      key: "opportunity",
      header: "Opportunity",
      width: "8.5rem",
      cell: (row) => (
        <OpportunityCell maxOpportunity={maxOpportunity} row={row} />
      ),
      sortValue: (row) => row.opportunity,
      sortable: true,
    },
    {
      key: "engines",
      header: "Visible on",
      width: "11rem",
      cell: (row) => (
        <VisibleOnCell
          mentionedEngines={row.mentionedEngines}
          missingEngines={row.engines}
        />
      ),
      sortValue: (row) => gapMissingEngineFamilies(row.mentionedEngines).length,
      sortable: true,
    },
    {
      key: "competitors",
      header: "Brands mentioned instead",
      width: "11rem",
      cell: (row) => (
        <BrandMentionsCell
          competitors={competitors}
          discovered={row.discoveredCompetitors}
          tracked={row.competitors}
        />
      ),
      sortValue: (row) =>
        row.competitors.length + row.discoveredCompetitors.length,
      sortable: true,
    },
    {
      key: "write",
      header: "",
      align: "right",
      width: "12.5rem",
      minWidth: "12.5rem",
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <WriteCell
            action={gapWriteAction(row.brief)}
            onOpenPost={onOpenPost}
            onRescan={
              gapCanRescan(row.brief) ? () => onRescanPrompt(row) : undefined
            }
            onWrite={() => onWritePrompt(row)}
            opportunityBucket={gapMeterLevel(
              maxOpportunity <= 0 ? 0 : row.opportunity / maxOpportunity
            )}
            postId={row.brief?.postId}
            rescanDisabled={isScanning}
            sourceKind="prompt"
          />
        </span>
      ),
    },
  ];

  const searchColumns: TableColumn<GeoSearchGapRow>[] = [
    {
      key: "question",
      header: "Source question",
      width: "1fr",
      cell: (row) => <QueriesCell prompt={row.prompt} queries={row.queries} />,
      sortValue: (row) => row.prompt,
      sortable: true,
    },
    {
      key: "impressions",
      header: "Impressions",
      width: "7rem",
      cell: (row) => (
        <NumberCell
          emptyLabel={GEO_GAPS_EMPTY_CELL.impressions}
          value={row.impressions}
        />
      ),
      sortValue: (row) => row.impressions ?? -1,
      sortable: true,
    },
    {
      key: "recommendation",
      header: "Recommendation",
      width: "9rem",
      cell: (row) => <RecommendationCell recommendation={row.recommendation} />,
      sortValue: (row) => searchGapActionOrder(row.recommendation.action),
      sortable: true,
    },
    {
      key: "write",
      header: "",
      align: "right",
      width: "12rem",
      minWidth: "12rem",
      cell: (row) => (
        <SearchWriteCell
          isDismissing={dismissingSearchId === row.id}
          onDismiss={() => onDismissSearch(row)}
          onOpenPost={onOpenPost}
          onWrite={(existingPageUrl) => onWriteSearch(row, existingPageUrl)}
          row={row}
        />
      ),
    },
  ];

  const sourceRows = tab === "prompt" ? promptGaps : searchGaps;
  const rows = tab === "prompt" ? filteredPromptGaps : filteredSearchGaps;
  const [tableRef, tableHeight] = useFillHeight(GEO_GAPS_TABLE_HEIGHT);
  const emptyKind =
    rows.length === 0
      ? geoGapsEmptyKind({
          tab,
          hasScanData,
          isScanning,
          hasSourceRows: sourceRows.length > 0,
          hasMatches: rows.length > 0,
        })
      : null;
  const viewedRef = useRef(false);
  const rowCount = rows.length;
  const promptGapCount = promptGaps.length;
  const searchGapCount = searchGaps.length;

  useEffect(() => {
    if (viewedRef.current) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_GAPS_VIEWED, {
      tab,
      empty_kind: emptyKind,
      gap_count: rowCount,
      prompt_gap_count: promptGapCount,
      search_gap_count: searchGapCount,
      has_scan_data: hasScanData,
    });
  }, [emptyKind, hasScanData, promptGapCount, rowCount, searchGapCount, tab]);
  const table =
    tab === "prompt" ? (
      <Table
        className="rounded-2xl"
        columns={promptColumns}
        data={filteredPromptGaps}
        onRowClick={(row) => setDetail({ kind: "prompt", id: row.id })}
        defaultSort={{ key: "opportunity", direction: "desc" }}
        getRowId={(row) => row.id}
        height={tableHeight}
      />
    ) : (
      <Table
        className="rounded-2xl"
        columns={searchColumns}
        data={filteredSearchGaps}
        onRowClick={(row) => setDetail({ kind: "search", id: row.id })}
        defaultSort={{ key: "impressions", direction: "desc" }}
        getRowId={(row) => row.id}
        height={tableHeight}
      />
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <GapsTabs
          onTabChange={setTab}
          promptCount={filteredPromptGaps.length}
          searchCount={filteredSearchGaps.length}
          tab={tab}
        />
        <GapsFilters
          engine={engine}
          engineFamilies={engineFamilies}
          onEngineChange={setEngine}
          onQueryChange={setQuery}
          query={query}
        />
      </div>

      <div className="min-h-0 flex-1" ref={tableRef}>
        {emptyKind !== null ? (
          <GapsEmpty
            isScanning={isScanning}
            kind={emptyKind}
            onRunScan={onRunScan}
            organizationSlug={organizationSlug}
          />
        ) : (
          table
        )}
      </div>
      <GapDetailDialog
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
          }
        }}
        prompt={
          detail?.kind === "prompt"
            ? (promptGaps.find((row) => row.id === detail.id) ?? null)
            : null
        }
        search={selectedSearch}
        searchActions={
          selectedSearch ? (
            <SearchWriteCell
              isDismissing={dismissingSearchId === selectedSearch.id}
              onDismiss={() => onDismissSearch(selectedSearch)}
              onOpenPost={(postId) => {
                setDetail(null);
                onOpenPost(postId);
              }}
              onWrite={(existingPageUrl) => {
                setDetail(null);
                onWriteSearch(selectedSearch, existingPageUrl);
              }}
              row={selectedSearch}
            />
          ) : null
        }
      />
    </div>
  );
}
