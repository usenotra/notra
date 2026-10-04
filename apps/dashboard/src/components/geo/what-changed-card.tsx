"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CHANGE_KIND_ORDER,
  GEO_CHANGES_COMPETITOR_STACK_LIMIT,
  GEO_CHANGES_EMPTY_DETAIL,
  GEO_CHANGES_LABEL,
  GEO_CHANGES_SKELETON_ROWS,
  GEO_CHANGES_SUMMARY_GROUPS,
  GEO_EMPTY_COMPETITORS,
  GEO_EMPTY_PROMPT_RESULTS,
} from "@notra/geo-core/constants/geo";
import { findCompetitor } from "@notra/geo-core/geo/domain";
import type {
  GeoChangeEvent,
  GeoChangesSummary,
  GeoChangesSummaryGroupKey,
  GeoCompetitor,
} from "@notra/geo-core/types/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { EngineIcon } from "@/components/geo/engine-icon";
import { PromptDetailDialog } from "@/components/geo/prompt-detail-dialog";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { useGeoProjectScope } from "@/components/providers/geo-project-provider";
import { EMPTY_STATE_TABLE_COLUMNS } from "@/constants/empty-state";
import {
  GEO_CHANGE_ICON_SIZE,
  GEO_CHANGE_KIND_ICONS,
  GEO_CHANGE_KIND_TONE_CLASSES,
} from "@/constants/geo-change-icons";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useGeoChanges } from "@/lib/hooks/use-geo";
import { useLogoStackLabels } from "@/lib/i18n/use-logo-stack-labels";
import { useRouter } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type {
  GeoChangeCellProps,
  GeoChangeCompetitorsCellProps,
  GeoChangeStateLabel,
  GeoChangeSummaryGroupProps,
  GeoChangeSummaryStatProps,
  GeoChangesSummaryRowProps,
  WhatChangedCardProps,
} from "@/types/geo";
import {
  describeGeoChangeDetail,
  geoChangeEngineLabel,
  geoChangePositionSortValue,
  isSameGeoChangeState,
} from "@/utils/geo-changes";
import { withGeoProject } from "@/utils/geo-paths";
import { promptTableRowForId } from "@/utils/geo-prompts";
import { tableHeightFor } from "@/utils/table";

const STAT_ICON_SIZE = 10;
const STAT_ICON_STROKE = 2.5;
const POSITION_ARROW_SIZE = 12;

const STAT_TONE_CLASS = {
  up: "bg-geo-up/10 text-geo-up",
  down: "bg-geo-down/10 text-geo-down",
} as const;

const STAT_ICON = {
  up: ArrowUp01Icon,
  down: ArrowDown01Icon,
} as const;

const CHANGES_DEFAULT_SORT = { key: "change", direction: "asc" } as const;

function SummaryStat({
  direction,
  label,
  hint,
  value,
}: GeoChangeSummaryStatProps) {
  const locale = useLocale();
  const isZero = value === 0;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex cursor-default items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium tabular-nums",
              isZero
                ? "bg-muted text-muted-foreground"
                : STAT_TONE_CLASS[direction]
            )}
          />
        }
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={STAT_ICON[direction]}
          size={STAT_ICON_SIZE}
          strokeWidth={STAT_ICON_STROKE}
        />
        <span className="sr-only">{label} </span>
        {value.toLocaleString(locale)}
      </TooltipTrigger>
      <TooltipContent className="max-w-56 text-pretty">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground block">{hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}

function SummaryGroup({ group, summary }: GeoChangeSummaryGroupProps) {
  const t = useTranslations("geo.whatChangedCard");
  const tGeoShared = useTranslations("geo.shared");
  const tLabels = useTranslations("common.labels");
  const groupLabels: Record<GeoChangesSummaryGroupKey, string> = {
    mentions: tGeoShared("mentionsLabel"),
    position: tLabels("position"),
    citations: tGeoShared("citations"),
  };
  const summaryLabels: Record<keyof GeoChangesSummary, string> = {
    gained: t("summaryLabels.gained"),
    lost: tGeoShared("lost"),
    positionImproved: tGeoShared("positionUp"),
    positionDropped: tGeoShared("positionDown"),
    citationsAdded: t("summaryLabels.citationsAdded"),
    citationsRemoved: t("summaryLabels.citationsRemoved"),
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground mr-0.5 text-xs">
        {groupLabels[group.key]}
      </span>
      <SummaryStat
        direction="up"
        hint={t(`summaryHints.${group.up}`)}
        label={summaryLabels[group.up]}
        value={summary[group.up]}
      />
      <SummaryStat
        direction="down"
        hint={t(`summaryHints.${group.down}`)}
        label={summaryLabels[group.down]}
        value={summary[group.down]}
      />
    </div>
  );
}

function SummaryToolbar({ summary }: GeoChangesSummaryRowProps) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      {GEO_CHANGES_SUMMARY_GROUPS.map((group, index) => (
        <div className="flex items-center gap-4" key={group.key}>
          {index > 0 ? (
            <span aria-hidden="true" className="bg-border h-3 w-px" />
          ) : null}
          <SummaryGroup group={group} summary={summary} />
        </div>
      ))}
    </div>
  );
}

function ChangeCell({ event }: GeoChangeCellProps) {
  const t = useTranslations("geo.whatChangedCard");
  const tGeoSharedKinds = useTranslations("geo.shared");
  const changeKindLabel = (kind: GeoChangeEvent["kind"]) => {
    if (kind === "position_improved") {
      return tGeoSharedKinds("positionUp");
    }
    if (kind === "position_dropped") {
      return tGeoSharedKinds("positionDown");
    }
    return t(`kinds.${kind}`);
  };
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center",
          GEO_CHANGE_KIND_TONE_CLASSES[event.kind]
        )}
      >
        <HugeiconsIcon
          icon={GEO_CHANGE_KIND_ICONS[event.kind]}
          size={GEO_CHANGE_ICON_SIZE}
        />
      </span>
      <span className="truncate font-medium">
        {changeKindLabel(event.kind)}
      </span>
    </span>
  );
}

function EngineCell({ event }: GeoChangeCellProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="flex size-4 shrink-0 items-center justify-center">
        <EngineIcon engine={event.engine} />
      </span>
      <span className="truncate">{geoChangeEngineLabel(event.engine)}</span>
    </span>
  );
}

function PositionCell({ event }: GeoChangeCellProps) {
  const t = useTranslations("geo.whatChangedCard");
  const tGeoShared = useTranslations("geo.shared");
  const tLabels = useTranslations("common.labels");
  const detail = describeGeoChangeDetail(event);
  const isUnchanged = isSameGeoChangeState(detail.before, detail.after);
  const stateLabel = (state: GeoChangeStateLabel) => {
    if (state.key === "position") {
      return t("states.position", { position: state.position });
    }
    if (state.key === "notCited") {
      return t("states.notCited");
    }
    if (state.key === "new") {
      return tLabels("new");
    }
    return tGeoShared(state.key);
  };

  if (isUnchanged) {
    return (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {stateLabel(detail.after)}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap tabular-nums">
      <span className="text-muted-foreground">{stateLabel(detail.before)}</span>
      <HugeiconsIcon
        aria-hidden="true"
        className="text-muted-foreground/60 shrink-0"
        icon={ArrowRight01Icon}
        size={POSITION_ARROW_SIZE}
      />
      <span>{stateLabel(detail.after)}</span>
    </span>
  );
}

function CompetitorLogosCell({
  event,
  competitors,
}: GeoChangeCompetitorsCellProps) {
  const logoStackLabels = useLogoStackLabels();
  const tGeoShared2 = useTranslations("geo.shared");
  const items = event.competitors.map((name) => {
    const competitor = findCompetitor(competitors, name);
    return {
      key: name,
      label: name,
      detail: competitor
        ? tGeoShared2("trackedCompetitor")
        : tGeoShared2("discoveredInAnswersNotTracked"),
      renderIcon: (className: string) => (
        <CompetitorLogo
          className={className}
          domain={competitor?.domain ?? null}
          name={name}
        />
      ),
    };
  });
  /*
   * One named brand beats four anonymous logos: the column is narrow, and the
   * row already says what happened, so the only open question is "to whom".
   */
  return (
    <LogoStack
      labels={logoStackLabels}
      items={items}
      limit={GEO_CHANGES_COMPETITOR_STACK_LIMIT}
      showLabel
    />
  );
}

function DetailCell({ event, competitors }: GeoChangeCompetitorsCellProps) {
  if (event.competitors.length > 0) {
    return <CompetitorLogosCell competitors={competitors} event={event} />;
  }
  return (
    <span className="text-muted-foreground text-xs">
      {GEO_CHANGES_EMPTY_DETAIL}
    </span>
  );
}

function changeColumnsFor(
  competitors: readonly GeoCompetitor[],
  labels: Record<"change" | "engine" | "prompt" | "position" | "detail", string>
): TableColumn<GeoChangeEvent>[] {
  return [
    {
      key: "change",
      header: labels.change,
      width: "14rem",
      sortable: true,
      cell: (row) => <ChangeCell event={row} />,
      sortValue: (row) => GEO_CHANGE_KIND_ORDER[row.kind],
    },
    {
      key: "engine",
      collapsePriority: 1,
      header: labels.engine,
      width: "8.5rem",
      sortable: true,
      cell: (row) => <EngineCell event={row} />,
      sortValue: (row) => geoChangeEngineLabel(row.engine),
    },
    {
      key: "prompt",
      header: labels.prompt,
      width: "1.4fr",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="text-sm">
          {row.prompt}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "position",
      collapsePriority: 2,
      header: labels.position,
      width: "14rem",
      sortable: true,
      cell: (row) => <PositionCell event={row} />,
      sortValue: geoChangePositionSortValue,
    },
    {
      key: "detail",
      collapsePriority: 3,
      header: labels.detail,
      width: "1fr",
      cell: (row) => <DetailCell competitors={competitors} event={row} />,
    },
  ];
}

function changeRowId(event: GeoChangeEvent): string {
  return `${event.kind}-${event.promptId}-${event.engine}`;
}

/** Empty body for the changes card: no comparison scan yet, or nothing moved. */
function ChangesEmpty({
  isScanning,
  reason,
}: {
  isScanning: boolean;
  reason: "needsScans" | "noChanges";
}) {
  const t = useTranslations("geo.whatChangedCard");
  const tGeoShared = useTranslations("geo.shared");
  return (
    <InstrumentEmpty
      busy={isScanning}
      className="h-40"
      message={isScanning ? tGeoShared("scanningEngines") : t(reason)}
      preview={
        <div className="px-6 pt-2">
          <EmptyStateTablePreview
            columns={EMPTY_STATE_TABLE_COLUMNS.changes}
            rows={3}
          />
        </div>
      }
      seed={GEO_CHANGES_LABEL}
    />
  );
}

export function WhatChangedCard({
  organizationId,
  organizationSlug,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  competitors = GEO_EMPTY_COMPETITORS,
  isScanning = false,
}: WhatChangedCardProps) {
  const t = useTranslations("geo.whatChangedCard");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { projectId } = useGeoProjectScope();
  const router = useRouter();
  const { data, isPending, isFetching } = useGeoChanges(organizationId);
  const [detail, setDetail] = useState<{
    promptId: string;
    engine: string;
  } | null>(null);
  const detailRow = detail
    ? promptTableRowForId(detail.promptId, promptResults)
    : null;

  const events = data?.events ?? [];
  const columns = changeColumnsFor(competitors, {
    change: t("columns.change"),
    engine: tGeoShared("engine"),
    prompt: tGeoShared("prompt"),
    position: tCommon("labels.position"),
    detail: tCommon("labels.competitors"),
  });
  const finishedAt = data?.currentScan?.finishedAt;
  let subline = t("subline");
  if (isScanning) {
    subline = tGeoShared("scanInProgress");
  } else if (finishedAt) {
    subline = t("sublineWithTime", {
      time: formatAiTrafficTimestamp(finishedAt, locale),
    });
  }

  function openEvent(event: GeoChangeEvent) {
    if (promptTableRowForId(event.promptId, promptResults)) {
      setDetail({ promptId: event.promptId, engine: event.engine });
      return;
    }
    router.push(
      withGeoProject(
        `/${organizationSlug}/geo/prompts?q=${encodeURIComponent(event.prompt)}`,
        projectId
      )
    );
  }

  let body = (
    <DataTable
      columns={columns}
      data={events}
      defaultSort={CHANGES_DEFAULT_SORT}
      getRowId={changeRowId}
      height={tableHeightFor(
        events.length === 0 ? GEO_CHANGES_SKELETON_ROWS : events.length
      )}
      loading={isPending || isFetching}
      onRowClick={openEvent}
      resizable
      rowHeight={TABLE_ROW_HEIGHT}
      toolbar={data ? <SummaryToolbar summary={data.summary} /> : undefined}
    />
  );
  if (!isPending && data && (!data.previousScan || events.length === 0)) {
    body = (
      <ChangesEmpty
        isScanning={isScanning}
        reason={data.previousScan ? "noChanges" : "needsScans"}
      />
    );
  }

  return (
    <>
      <InstrumentSection
        description={subline}
        eyebrow={tGeoShared("whatChanged")}
      >
        {body}
      </InstrumentSection>
      <PromptDetailDialog
        initialEngine={detail?.engine}
        isScanning={isScanning}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
          }
        }}
        open={detailRow !== null}
        row={detailRow}
      />
    </>
  );
}
