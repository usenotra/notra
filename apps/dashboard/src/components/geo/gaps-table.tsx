"use client";

import {
  Refresh03Icon,
  SearchIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_GAPS_ENGINE_FILTER_ALL,
  GEO_GAPS_METER_STEPS,
  GEO_GAPS_METER_TONE_CLASS,
  GEO_GAPS_TABLE_HEIGHT,
  GEO_GAPS_TABLE_LOGO_LIMIT,
  GEO_PROMPTS_NAV_LINK,
  GEO_SEARCH_GAP_ACTION_CLASS,
} from "@notra/geo-core/constants/geo";
import { findCompetitor } from "@notra/geo-core/geo/domain";
import type {
  GeoAiSearchGapRow,
  GeoGapWriteAction,
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
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GapDetailSheet } from "@/components/geo/gap-detail-sheet";
import { SearchGapDetailSheet } from "@/components/geo/search-gap-detail";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_GAPS_EMPTY_MESSAGE_KEYS,
  GEO_GAPS_TABS,
  GEO_SEARCH_GAP_ACTION_LABEL_KEYS,
} from "@/constants/geo-gaps";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { useLogoStackLabels } from "@/lib/i18n/use-logo-stack-labels";
import { cn } from "@/lib/utils";
import type {
  GeoGapBrandMentionsCellProps,
  GeoGapCompetitorFields,
  GeoGapContentCellProps,
  GeoGapEngineLogosProps,
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
  filterAiSearchGaps,
  filterPromptGaps,
  filterSearchGaps,
  gapCanRescan,
  gapOpportunityLevel,
  gapMeterTone,
  gapMissingEngineFamilies,
  gapVisibleOnLabel,
  gapWriteAction,
  geoGapsEmptyKind,
  isGeoGapsTab,
  maxGapOpportunity,
  searchGapActionOrder,
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
  onIgnore,
  isIgnoring = false,
  compact = false,
}: GeoGapsWriteCellProps) {
  const t = useTranslations("geo.gapsTable");
  const tGeoShared2 = useTranslations("geo.shared");
  const tLabels = useTranslations("common.labels");
  const writeActionLabels: Record<GeoGapWriteAction, string> = {
    write: tLabels("write"),
    review: t("writeActions.review"),
    writing: tGeoShared2("writing"),
    open: t("writeActions.open"),
  };
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {onIgnore && compact ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={t("ignore")}
                className="text-muted-foreground"
                disabled={isIgnoring}
                onClick={(event) => {
                  event.stopPropagation();
                  onIgnore();
                }}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            {isIgnoring ? (
              <StatusSpinner />
            ) : (
              <HugeiconsIcon icon={ViewOffSlashIcon} size={15} />
            )}
          </TooltipTrigger>
          <TooltipContent>{t("ignore")}</TooltipContent>
        </Tooltip>
      ) : null}
      {onIgnore && !compact ? (
        <Button
          disabled={isIgnoring}
          onClick={(event) => {
            event.stopPropagation();
            onIgnore();
          }}
          size="sm"
          variant="ghost"
        >
          {isIgnoring ? <StatusSpinner /> : null}
          {t("ignore")}
        </Button>
      ) : null}
      {onRescan ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={tGeoShared2("rescan")}
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
            <HugeiconsIcon icon={Refresh03Icon} size={15} />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {t("rescanTooltip")}
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
        {writeActionLabels[action]}
      </Button>
    </span>
  );
}

function RecommendationCell({ recommendation }: GeoGapRecommendationCellProps) {
  const tGeoShared = useTranslations("geo.shared");
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
        {tGeoShared(GEO_SEARCH_GAP_ACTION_LABEL_KEYS[recommendation.action])}
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
  const t = useTranslations("geo.gapsTable");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
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
          {tCommon("labels.dismiss")}
        </Button>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onWrite();
          }}
          size="sm"
          variant="outline"
        >
          {t(`searchWrite.${action}`)}
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
      {action === "update"
        ? tGeoShared("updatePage")
        : t(`searchWrite.${action}`)}
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
  const t = useTranslations("geo.gapsTable");
  const tGeoShared = useTranslations("geo.shared");
  if (row.won) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="inline-flex cursor-default" />}
        >
          <Badge className="text-geo-up font-normal" variant="outline">
            {tGeoShared("won")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{t("wonDetail")}</TooltipContent>
      </Tooltip>
    );
  }
  const level = gapOpportunityLevel(row.opportunity, maxOpportunity);
  const missing = gapMissingEngineFamilies(row.engines).length;
  const visible = gapMissingEngineFamilies(row.mentionedEngines).length;
  return (
    <GapMeter
      label={t("opportunityLabel", {
        level,
        steps: GEO_GAPS_METER_STEPS,
        rate: formatMentionRate(row.ownMentionRate),
        missing,
        total: missing + visible,
        competitors: row.competitors.length + row.discoveredCompetitors.length,
      })}
      level={level}
    />
  );
}

function ContentCell({ title, subtitle }: GeoGapContentCellProps) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm leading-snug font-medium" title={title}>
        {title}
      </span>
      {subtitle ? (
        <span
          className="text-muted-foreground truncate text-xs"
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
  const t = useTranslations("geo.gapsTable");
  const visible = gapMissingEngineFamilies(mentionedEngines);
  const missing = gapMissingEngineFamilies(missingEngines);
  if (visible.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="text-muted-foreground inline-flex cursor-default items-center gap-2" />
          }
        >
          <span className="text-xs tabular-nums">
            {gapVisibleOnLabel(mentionedEngines, missingEngines)}
          </span>
          <span aria-hidden="true" className="inline-flex items-center gap-1">
            {Array.from({ length: GEO_GAPS_TABLE_LOGO_LIMIT }, (_, index) => (
              <span
                className="border-muted-foreground/40 size-4 rounded-full border border-dashed"
                key={index}
              />
            ))}
          </span>
          <span className="sr-only">{t("emptyCell.visibleOn")}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {t("visibleOnMissing", {
            engines: missing
              .map((family) => engineFamilyLabel(family))
              .join(", "),
          })}
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-xs tabular-nums">
        {gapVisibleOnLabel(mentionedEngines, missingEngines)}
      </span>
      <EngineLogos
        detail={t("engineDetail.mentioned")}
        engines={mentionedEngines}
      />
    </span>
  );
}

function EngineLogos({ engines, detail }: GeoGapEngineLogosProps) {
  const logoStackLabels = useLogoStackLabels();
  return (
    <LogoStack
      labels={logoStackLabels}
      limit={GEO_GAPS_TABLE_LOGO_LIMIT}
      items={gapMissingEngineFamilies(engines).map((family) => ({
        key: family,
        label: engineFamilyLabel(family),
        detail,
        renderIcon: (className) => (
          <EngineIcon className={className} engine={family} />
        ),
      }))}
    />
  );
}

function QueriesCell({ prompt, queries }: GeoGapQueriesCellProps) {
  const t = useTranslations("geo.gapsTable");
  const count = t("searchQueriesCount", { count: queries.length });
  return (
    <ContentCell
      subtitle={queries.length === 0 ? null : count}
      title={prompt}
    />
  );
}

function NumberCell({ value, emptyLabel, format }: GeoGapNumberCellProps) {
  const locale = useLocale();
  if (value === null) {
    return <span className="text-muted-foreground text-xs">{emptyLabel}</span>;
  }
  return (
    <span className="tabular-nums">
      {format ? format(value) : value.toLocaleString(locale)}
    </span>
  );
}

function GapsEmpty({
  kind,
  isScanning,
  organizationSlug,
  onRunScan,
}: GeoGapsEmptyProps) {
  const t = useTranslations("geo.gapsTable.empty");
  const tGeoShared = useTranslations("geo.shared");
  const { projectId } = useGeoProjectScope();
  const copyKey = GEO_GAPS_EMPTY_MESSAGE_KEYS[kind];
  let action = null;
  if (kind === "no-scan") {
    action = (
      <Button disabled={isScanning} onClick={onRunScan}>
        {isScanning ? <StatusSpinner /> : null}
        {tGeoShared("runScan")}
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
        {t("noSearchGaps.action")}
      </Button>
    );
  }

  return (
    <EmptyState
      action={action}
      description={t(`${copyKey}.description`)}
      preview={
        <EmptyStateTablePreview
          columns={EMPTY_STATE_TABLE_COLUMNS.gaps}
          rows={EMPTY_STATE_TABLE_ROWS}
        />
      }
      title={
        copyKey === "noScan" ? tGeoShared("noScanYet") : t(`${copyKey}.title`)
      }
    />
  );
}

function GapsTabs({ tab, onTabChange, counts }: GeoGapsTabsProps) {
  const t = useTranslations("geo.gapsTable");
  const locale = useLocale();
  return (
    <PermissionRow
      className="w-fit shrink-0"
      label={t("gapType")}
      layout="compact"
      onValueChange={(value) => {
        if (isGeoGapsTab(value)) {
          onTabChange(value);
        }
      }}
      value={tab}
    >
      {GEO_GAPS_TABS.map((option) => (
        <PermissionOption key={option.value} value={option.value}>
          {t(`tabs.${option.value}`)}
          <span className="text-xs tabular-nums opacity-70">
            {counts[option.value].toLocaleString(locale)}
          </span>
        </PermissionOption>
      ))}
    </PermissionRow>
  );
}

function GapsFilters({
  tab,
  query,
  onQueryChange,
  engine,
  onEngineChange,
  engineFamilies,
}: GeoGapsFiltersProps) {
  const t = useTranslations("geo.gapsTable");
  const showEngineFilter =
    tab === "prompt" &&
    (engineFamilies.length > 0 || engine !== GEO_GAPS_ENGINE_FILTER_ALL);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-72">
        <HugeiconsIcon
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
          icon={SearchIcon}
          size={15}
        />
        <Input
          aria-label={t("filterLabel")}
          className="pl-9"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("filterPlaceholder")}
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
          <SelectTrigger aria-label={t("engineFilterLabel")} className="w-44">
            <SelectValue>
              {engine === GEO_GAPS_ENGINE_FILTER_ALL
                ? t("allEngines")
                : engineFamilyLabel(engine)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-56">
            <SelectItem value={GEO_GAPS_ENGINE_FILTER_ALL}>
              {t("allEngines")}
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
  const logoStackLabels = useLogoStackLabels();
  const t = useTranslations("geo.gapsTable");
  const tGeoShared2 = useTranslations("geo.shared");
  const tGeoShared = useTranslations("geo.shared");
  const trackedItems = tracked.map((name) => {
    const competitor = findCompetitor(competitors, name);
    return {
      key: `tracked:${name}`,
      label: name,
      detail: competitor
        ? t("competitorDetail.trackedKind", {
            kind:
              competitor.kind === "direct"
                ? tGeoShared("directCompetitor")
                : tGeoShared("indirectCompetitor"),
          })
        : tGeoShared2("trackedCompetitor"),
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
    detail: tGeoShared2("discoveredInAnswersNotTracked"),
    renderIcon: (className: string) => (
      <CompetitorLogo className={className} domain={null} name={name} />
    ),
  }));
  return (
    <LogoStack
      labels={logoStackLabels}
      emptyLabel={t("emptyCell.competitors")}
      limit={GEO_GAPS_TABLE_LOGO_LIMIT}
      items={[...trackedItems, ...discoveredItems]}
    />
  );
}

export function GeoGapsTable({
  promptGaps,
  searchGaps,
  aiSearchGaps,
  competitors,
  hasScanData,
  isScanning,
  organizationId,
  organizationSlug,
  onRunScan,
  onWritePrompt,
  onWriteSearch,
  onWriteAiSearch,
  onDismissSearch,
  dismissingSearchId,
  onRescanPrompt,
  onIgnorePrompt,
  ignoringPromptId,
  onOpenPost,
}: GeoGapsTableProps) {
  const t = useTranslations("geo.gapsTable");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const [tab, setTab] = useState<GeoGapsTab>("prompt");
  const [detailPromptId, setDetailPromptId] = useState<string | null>(null);
  const [detailSearchId, setDetailSearchId] = useState<string | null>(null);
  const selectedPrompt =
    promptGaps.find((row) => row.id === detailPromptId) ?? null;
  const selectedSearch =
    searchGaps.find((row) => row.id === detailSearchId) ?? null;
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
    () => maxGapOpportunity(promptGaps),
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
  const filteredAiSearchGaps = useMemo(
    () => filterAiSearchGaps(aiSearchGaps, query),
    [aiSearchGaps, query]
  );
  const maxAiSearchOpportunity = useMemo(
    () => maxGapOpportunity(aiSearchGaps),
    [aiSearchGaps]
  );

  const renderPromptActions = (row: GeoPromptGapRow, inSheet = false) => {
    const action = gapWriteAction(row.brief);
    const closeSheet = () => {
      if (inSheet) {
        setDetailPromptId(null);
      }
    };
    return (
      <WriteCell
        action={action}
        compact={!inSheet}
        isIgnoring={ignoringPromptId === row.id}
        onIgnore={
          action === "write"
            ? () => {
                closeSheet();
                onIgnorePrompt(row);
              }
            : undefined
        }
        onOpenPost={(postId) => {
          closeSheet();
          onOpenPost(postId);
        }}
        onRescan={
          gapCanRescan(row.brief) ? () => onRescanPrompt(row) : undefined
        }
        onWrite={() => {
          closeSheet();
          onWritePrompt(row);
        }}
        opportunityBucket={gapOpportunityLevel(row.opportunity, maxOpportunity)}
        postId={row.brief?.postId}
        rescanDisabled={isScanning}
        sourceKind="prompt"
      />
    );
  };

  function competitorsColumn<
    T extends GeoGapCompetitorFields,
  >(): TableColumn<T> {
    return {
      key: "competitors",
      collapsePriority: 2,
      header: tCommon("labels.competitors"),
      width: "9.5rem",
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
    };
  }

  const promptColumns: TableColumn<GeoPromptGapRow>[] = [
    {
      key: "prompt",
      header: tGeoShared("prompt"),
      width: "1fr",
      minWidth: "12rem",
      cell: (row) => {
        const headline = row.brief?.workingTitle ?? row.title;
        return (
          <ContentCell
            subtitle={
              row.searchQueries.length === 0
                ? null
                : t("aiSearched", { queries: row.searchQueries.join(", ") })
            }
            title={headline ?? row.prompt}
          />
        );
      },
      sortValue: (row) => row.brief?.workingTitle ?? row.title ?? row.prompt,
      sortable: true,
    },
    {
      key: "opportunity",
      header: t("columns.opportunity"),
      width: "9rem",
      cell: (row) => (
        <OpportunityCell maxOpportunity={maxOpportunity} row={row} />
      ),
      sortValue: (row) => row.opportunity,
      sortable: true,
    },
    {
      key: "engines",
      collapsePriority: 1,
      header: t("columns.visibleOn"),
      width: "9.5rem",
      cell: (row) => (
        <VisibleOnCell
          mentionedEngines={row.mentionedEngines}
          missingEngines={row.engines}
        />
      ),
      sortValue: (row) => gapMissingEngineFamilies(row.mentionedEngines).length,
      sortable: true,
    },
    competitorsColumn(),
    {
      key: "write",
      header: "",
      align: "right",
      width: "9.5rem",
      minWidth: "9.5rem",
      cell: (row) => (
        <span className="inline-flex items-center gap-1">
          {renderPromptActions(row)}
        </span>
      ),
    },
  ];

  const searchColumns: TableColumn<GeoSearchGapRow>[] = [
    {
      key: "question",
      header: t("columns.sourceQuestion"),
      width: "1fr",
      cell: (row) => <QueriesCell prompt={row.prompt} queries={row.queries} />,
      sortValue: (row) => row.prompt,
      sortable: true,
    },
    {
      key: "impressions",
      header: tCommon("labels.impressions"),
      hint: t("hints.impressions"),
      width: "7rem",
      cell: (row) => (
        <NumberCell
          emptyLabel={t("emptyCell.impressions")}
          value={row.impressions}
        />
      ),
      sortValue: (row) => row.impressions ?? -1,
      sortable: true,
    },
    {
      key: "recommendation",
      header: tCommon("labels.recommendation"),
      hint: t("hints.recommendation"),
      width: "9rem",
      cell: (row) => <RecommendationCell recommendation={row.recommendation} />,
      sortValue: (row) => searchGapActionOrder(row.recommendation.action),
      sortable: true,
    },
    {
      key: "write",
      header: t("columns.action"),
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

  const aiSearchColumns: TableColumn<GeoAiSearchGapRow>[] = [
    {
      key: "query",
      header: t("columns.aiSearch"),
      width: "1fr",
      minWidth: "12rem",
      cell: (row) => (
        <ContentCell
          subtitle={
            row.prompts[0]
              ? t("aiSearchSubtitle", {
                  prompt: row.prompts[0],
                  more: row.prompts.length - 1,
                })
              : null
          }
          title={row.brief?.workingTitle ?? row.query}
        />
      ),
      sortValue: (row) => row.query,
      sortable: true,
    },
    {
      key: "searches",
      header: t("columns.searches"),
      hint: t("hints.searches"),
      width: "7rem",
      cell: (row) => (
        <NumberCell
          emptyLabel={t("emptyCell.impressions")}
          value={row.searches}
        />
      ),
      sortValue: (row) => row.searches,
      sortable: true,
    },
    {
      key: "engines",
      collapsePriority: 1,
      header: t("columns.searchedBy"),
      width: "9.5rem",
      cell: (row) => (
        <EngineLogos
          detail={t("engineDetail.searched")}
          engines={row.engines}
        />
      ),
      sortValue: (row) => gapMissingEngineFamilies(row.engines).length,
      sortable: true,
    },
    competitorsColumn(),
    {
      key: "write",
      header: "",
      align: "right",
      width: "9.5rem",
      minWidth: "9.5rem",
      cell: (row) => (
        <WriteCell
          action={gapWriteAction(row.brief)}
          onOpenPost={onOpenPost}
          onWrite={() => onWriteAiSearch(row)}
          opportunityBucket={gapOpportunityLevel(
            row.opportunity,
            maxAiSearchOpportunity
          )}
          postId={row.brief?.postId}
          sourceKind="ai_search"
        />
      ),
    },
  ];

  const sourceRowsByTab = {
    prompt: promptGaps,
    search: searchGaps,
    ai: aiSearchGaps,
  };
  const rowsByTab = {
    prompt: filteredPromptGaps,
    search: filteredSearchGaps,
    ai: filteredAiSearchGaps,
  };
  const sourceRows = sourceRowsByTab[tab];
  const rows = rowsByTab[tab];
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
  const aiSearchGapCount = aiSearchGaps.length;

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
      ai_search_gap_count: aiSearchGapCount,
      has_scan_data: hasScanData,
    });
  }, [
    aiSearchGapCount,
    emptyKind,
    hasScanData,
    promptGapCount,
    rowCount,
    searchGapCount,
    tab,
  ]);
  const tables = {
    prompt: (
      <Table
        className="rounded-2xl"
        columns={promptColumns}
        data={filteredPromptGaps}
        defaultSort={{ key: "opportunity", direction: "desc" }}
        getRowId={(row) => row.id}
        height={tableHeight}
        onRowClick={(row) => setDetailPromptId(row.id)}
      />
    ),
    search: (
      <Table
        className="rounded-2xl"
        columns={searchColumns}
        data={filteredSearchGaps}
        defaultSort={{ key: "impressions", direction: "desc" }}
        getRowId={(row) => row.id}
        height={tableHeight}
        onRowClick={(row) => setDetailSearchId(row.id)}
      />
    ),
    ai: (
      <Table
        className="rounded-2xl"
        columns={aiSearchColumns}
        data={filteredAiSearchGaps}
        defaultSort={{ key: "searches", direction: "desc" }}
        getRowId={(row) => row.id}
        height={tableHeight}
      />
    ),
  };
  const table = tables[tab];

  const sheetActions = selectedPrompt
    ? renderPromptActions(selectedPrompt, true)
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <GapsTabs
          onTabChange={setTab}
          counts={{
            prompt: filteredPromptGaps.length,
            search: filteredSearchGaps.length,
            ai: filteredAiSearchGaps.length,
          }}
          tab={tab}
        />
        <GapsFilters
          engine={engine}
          engineFamilies={engineFamilies}
          onEngineChange={setEngine}
          onQueryChange={setQuery}
          query={query}
          tab={tab}
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
      <GapDetailSheet
        actions={sheetActions}
        isScanning={isScanning}
        onOpenChange={(open) => {
          if (!open) {
            setDetailPromptId(null);
          }
        }}
        organizationId={organizationId}
        prompt={selectedPrompt}
      />
      <SearchGapDetailSheet
        actions={
          selectedSearch ? (
            <SearchWriteCell
              isDismissing={dismissingSearchId === selectedSearch.id}
              onDismiss={() => onDismissSearch(selectedSearch)}
              onOpenPost={(postId) => {
                setDetailSearchId(null);
                onOpenPost(postId);
              }}
              onWrite={(existingPageUrl) => {
                setDetailSearchId(null);
                onWriteSearch(selectedSearch, existingPageUrl);
              }}
              row={selectedSearch}
            />
          ) : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setDetailSearchId(null);
          }
        }}
        row={selectedSearch}
      />
    </div>
  );
}
