"use client";

import {
  File02Icon,
  MoreHorizontalIcon,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@notra/ui/components/ui/dropdown-menu";
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
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GapDetailSheet } from "@/components/geo/gap-detail-sheet";
import { SearchGapDetailSheet } from "@/components/geo/search-gap-detail";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import {
  GEO_GAPS_EMPTY_MESSAGE_KEYS,
  GEO_GAPS_TABS,
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
  GeoGapSearchWriteCellProps,
  GeoGapsWriteCellProps,
  GeoGapsEmptyProps,
  GeoGapsFiltersProps,
  GeoGapsTab,
  GeoGapsTableProps,
  GeoGapsTabsProps,
  GeoUnifiedSearchGap,
  GeoGapVisibleOnCellProps,
} from "@/types/components/geo-gaps";
import { formatMentionRate } from "@/utils/geo-charts";
import {
  filterPromptGaps,
  filterUnifiedSearchGaps,
  gapCanRescan,
  gapOpportunityLevel,
  gapMeterTone,
  gapMissingEngineFamilies,
  gapVisibleOnLabel,
  gapWriteAction,
  geoGapsEmptyKind,
  isGeoGapsTab,
  maxGapOpportunity,
  primarySearchQuery,
  searchGapAiDraft,
  searchGapDemandRank,
  unifySearchGaps,
  uniqueGapEngineFamilies,
} from "@/utils/geo-gaps";

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

function runGapWriteAction({
  action,
  postId,
  sourceKind,
  opportunityBucket,
  onOpenPost,
  onWrite,
}: Pick<
  GeoGapsWriteCellProps,
  | "action"
  | "postId"
  | "sourceKind"
  | "opportunityBucket"
  | "onOpenPost"
  | "onWrite"
>) {
  trackEvent(POSTHOG_EVENTS.GEO_GAP_WRITE_CLICKED, {
    source_kind: sourceKind,
    action,
    has_existing_post: Boolean(postId),
    opportunity_bucket: opportunityBucket,
  });
  if (
    (action === "open" || action === "review" || action === "writing") &&
    postId
  ) {
    onOpenPost(postId);
    return;
  }
  onWrite();
}

function MoreActionsMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={label}
            onClick={(event) => event.stopPropagation()}
            size="icon-sm"
            variant="ghost"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-48"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const handleWrite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    runGapWriteAction({
      action,
      postId,
      sourceKind,
      opportunityBucket,
      onOpenPost,
      onWrite,
    });
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
        onClick={handleWrite}
        size="sm"
        variant={action === "write" ? "default" : "outline"}
      >
        {writeActionLabels[action]}
      </Button>
    </span>
  );
}

function SearchWriteCell({
  row,
  isDismissing,
  onOpenPost,
  onWrite,
  onDismiss,
  compact = false,
  menuItems,
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
  const moreLabel = t("moreActions", { query: row.prompt });
  if (compact) {
    // The table column only fits the primary action; the rest go in a menu.
    const hasDismiss = action === "ignore";
    return (
      <span className="inline-flex items-center justify-end gap-1">
        <Button
          onClick={(event) => {
            event.stopPropagation();
            onWrite(
              action === "create" || action === "ignore"
                ? undefined
                : topTargetUrl
            );
          }}
          size="sm"
          variant={action === "ignore" ? "outline" : "default"}
        >
          {action === "update"
            ? tGeoShared("updatePage")
            : t(`searchWrite.${action}`)}
        </Button>
        {hasDismiss || menuItems ? (
          <MoreActionsMenu label={moreLabel}>
            {menuItems}
            {hasDismiss ? (
              <DropdownMenuItem disabled={isDismissing} onClick={onDismiss}>
                {isDismissing ? (
                  <StatusSpinner />
                ) : (
                  <HugeiconsIcon icon={ViewOffSlashIcon} size={15} />
                )}
                {tCommon("labels.dismiss")}
              </DropdownMenuItem>
            ) : null}
          </MoreActionsMenu>
        ) : null}
      </span>
    );
  }
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

function GapsEmpty({ kind, isScanning, onRunScan }: GeoGapsEmptyProps) {
  const t = useTranslations("geo.gapsTable.empty");
  const tGeoShared = useTranslations("geo.shared");
  const copyKey = GEO_GAPS_EMPTY_MESSAGE_KEYS[kind];
  let action = null;
  if (kind === "no-scan") {
    action = (
      <Button disabled={isScanning} onClick={onRunScan}>
        {isScanning ? <StatusSpinner /> : null}
        {tGeoShared("runScan")}
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
  snapshotReady = true,
  isScanning,
  organizationId,
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
  const unifiedSearchRows = useMemo(
    () =>
      unifySearchGaps(searchGaps, aiSearchGaps).sort(
        (left, right) => searchGapDemandRank(right) - searchGapDemandRank(left)
      ),
    [aiSearchGaps, searchGaps]
  );
  const selectedSearchGap =
    unifiedSearchRows.find(
      (gap) => `${gap.kind}:${gap.row.id}` === detailSearchId
    ) ?? null;
  const filteredSearchRows = useMemo(
    () => filterUnifiedSearchGaps(unifiedSearchRows, query),
    [query, unifiedSearchRows]
  );
  const maxAiSearchOpportunity = useMemo(
    () => maxGapOpportunity(aiSearchGaps),
    [aiSearchGaps]
  );

  const renderSearchActions = (gap: GeoUnifiedSearchGap, inSheet = false) => {
    const consoleRow = gap.kind === "console" ? gap.row : null;
    const ai = gap.kind === "console" ? gap.ai : gap.row;
    const closeSheet = () => {
      if (inSheet) {
        setDetailSearchId(null);
      }
    };
    const aiWriteProps = (aiRow: GeoAiSearchGapRow) => ({
      action: gapWriteAction(aiRow.brief),
      onOpenPost: (postId: string) => {
        closeSheet();
        onOpenPost(postId);
      },
      onWrite: () => {
        closeSheet();
        onWriteAiSearch(aiRow);
      },
      opportunityBucket: gapOpportunityLevel(
        aiRow.opportunity,
        maxAiSearchOpportunity
      ),
      postId: aiRow.brief?.postId,
      sourceKind: "ai_search" as const,
    });
    const renderAiWriteCell = (aiRow: GeoAiSearchGapRow) => (
      <WriteCell {...aiWriteProps(aiRow)} />
    );
    if (consoleRow) {
      // Console actions stay available; an AI-only draft is offered alongside.
      const aiDraft = searchGapAiDraft(gap);
      const consoleActions = (
        <SearchWriteCell
          compact={!inSheet}
          isDismissing={dismissingSearchId === consoleRow.id}
          menuItems={
            aiDraft ? (
              <DropdownMenuItem
                onClick={() => runGapWriteAction(aiWriteProps(aiDraft))}
              >
                <HugeiconsIcon icon={File02Icon} size={15} />
                {t("openAiDraft")}
              </DropdownMenuItem>
            ) : undefined
          }
          onDismiss={() => {
            closeSheet();
            onDismissSearch(consoleRow);
          }}
          onOpenPost={(postId) => {
            closeSheet();
            onOpenPost(postId);
          }}
          onWrite={(existingPageUrl) => {
            closeSheet();
            onWriteSearch(consoleRow, existingPageUrl);
          }}
          row={consoleRow}
        />
      );
      if (!aiDraft || !inSheet) {
        return consoleActions;
      }
      return (
        <span className="inline-flex items-center justify-end gap-1">
          {renderAiWriteCell(aiDraft)}
          {consoleActions}
        </span>
      );
    }
    return ai ? renderAiWriteCell(ai) : null;
  };

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

  const searchColumns: TableColumn<GeoUnifiedSearchGap>[] = [
    {
      key: "question",
      header: (
        <>
          <span className="hidden sm:inline">{t("columns.searchQuery")}</span>
          <span className="sm:hidden">{tCommon("labels.query")}</span>
        </>
      ),
      width: "1fr",
      minWidth: "9rem",
      cell: ({ kind, row }) =>
        kind === "console" ? (
          <button
            aria-label={t("openSearchGap", { query: primarySearchQuery(row) })}
            className="w-full cursor-pointer text-left"
            onClick={() => setDetailSearchId(`console:${row.id}`)}
            type="button"
          >
            <ContentCell
              subtitle={
                row.prompt === primarySearchQuery(row) ? null : row.prompt
              }
              title={primarySearchQuery(row)}
            />
          </button>
        ) : (
          <button
            aria-label={t("openSearchGap", { query: row.query })}
            className="w-full cursor-pointer text-left"
            onClick={() => setDetailSearchId(`ai:${row.id}`)}
            type="button"
          >
            <ContentCell
              subtitle={
                row.prompts[0]
                  ? t("aiSearchSubtitle", {
                      prompt: row.prompts[0],
                      more: row.prompts.length - 1,
                    })
                  : null
              }
              title={row.query}
            />
          </button>
        ),
      sortValue: ({ kind, row }) =>
        kind === "console" ? primarySearchQuery(row) : row.query,
      sortable: true,
    },
    {
      key: "impressions",
      header: tCommon("labels.impressions"),
      width: "8.5rem",
      minWidth: "8.5rem",
      collapsePriority: 2,
      cell: (gap) =>
        gap.kind === "console" ? (
          <NumberCell
            emptyLabel={t("emptyCell.impressions")}
            value={gap.row.impressions}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortValue: (gap) =>
        gap.kind === "console" ? (gap.row.impressions ?? -1) : -1,
      sortable: true,
    },
    {
      key: "searches",
      header: t("columns.searches"),
      width: "8.5rem",
      minWidth: "8.5rem",
      collapsePriority: 1,
      cell: (gap) => {
        const ai = gap.kind === "console" ? gap.ai : gap.row;
        const competitorNames = ai
          ? [...ai.competitors, ...ai.discoveredCompetitors]
          : [];
        return ai ? (
          <span
            className="inline-flex items-center gap-1 whitespace-nowrap"
            title={
              competitorNames.length > 0
                ? `${tCommon("labels.competitors")}: ${competitorNames.join(", ")}`
                : undefined
            }
          >
            <NumberCell emptyLabel="" value={ai.searches} />
            <EngineLogos
              detail={t("engineDetail.searched")}
              engines={ai.engines}
            />
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      sortValue: (gap) =>
        gap.kind === "console" ? (gap.ai?.searches ?? -1) : gap.row.searches,
      sortable: true,
    },
    {
      key: "competitors",
      collapsePriority: 3,
      header: tCommon("labels.competitors"),
      width: "9.5rem",
      cell: (gap) => {
        const ai = gap.kind === "console" ? gap.ai : gap.row;
        return ai ? (
          <BrandMentionsCell
            competitors={competitors}
            discovered={ai.discoveredCompetitors}
            tracked={ai.competitors}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
      sortValue: (gap) => {
        const ai = gap.kind === "console" ? gap.ai : gap.row;
        return ai ? ai.competitors.length + ai.discoveredCompetitors.length : 0;
      },
      sortable: true,
    },
    {
      key: "write",
      header: t("columns.action"),
      align: "right",
      width: "8rem",
      minWidth: "8rem",
      cell: (gap) => renderSearchActions(gap),
    },
  ];

  const sourceRowsByTab = {
    prompt: promptGaps,
    search: unifiedSearchRows,
  };
  const rowsByTab = {
    prompt: filteredPromptGaps,
    search: filteredSearchRows,
  };
  const sourceRows = sourceRowsByTab[tab];
  const rows = rowsByTab[tab];
  const [tableRef, tableHeight] = useFillHeight(GEO_GAPS_TABLE_HEIGHT);
  const emptyKind =
    rows.length === 0
      ? geoGapsEmptyKind({
          tab,
          hasScanData,
          snapshotReady,
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
        className="rounded-2xl [&_tbody_td]:align-middle"
        columns={searchColumns}
        data={filteredSearchRows}
        getRowId={({ kind, row }) => `${kind}:${row.id}`}
        height={tableHeight}
        onRowClick={(gap) => setDetailSearchId(`${gap.kind}:${gap.row.id}`)}
        rowKeyboardActivation={false}
        rowSizing="content"
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
            search: filteredSearchRows.length,
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
          selectedSearchGap
            ? renderSearchActions(selectedSearchGap, true)
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            setDetailSearchId(null);
          }
        }}
        row={selectedSearchGap}
      />
    </div>
  );
}
