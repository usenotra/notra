"use client";

import { SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_CITATIONS_ROW_HEIGHT,
  GEO_PURPOSE_COLUMN_WIDTH,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficLogEntry } from "@notra/geo-core/types/geo";
import { formatTrafficLocation } from "@notra/geo-core/utils/geo-project-domains";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { PurposeBadge } from "@/components/geo/purpose-badge";
import { CountryFlag } from "@/components/geo/twemoji";
import { Table, type TableColumn } from "@/components/motion/table";
import {
  GEO_LOG_ARRIVE_ANIMATION_MS,
  GEO_LOG_ARRIVE_STAGGER_STEPS,
} from "@/constants/geo-citations";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import { useAiTrafficLabels } from "@/lib/hooks/use-ai-traffic-labels";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type { CitationsTableProps } from "@/types/geo";
import { countryName } from "@/utils/country";
import {
  citationProviderTooltip,
  arrivedCitationRowIds,
  citationRowIds,
  formatCitationProvider,
  formatCitationTimestamp,
} from "@/utils/geo-citations";

function ProviderCell({ entry }: { entry: GeoTrafficLogEntry }) {
  const t = useTranslations("geo.citationsTable");
  const tGeoShared = useTranslations("geo.shared");
  const detail = citationProviderTooltip(entry);
  const trafficLabels = useAiTrafficLabels();
  const engine = entry.agent || entry.source;
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={t("showDetails", { title: detail.title })}
            className="focus-visible:ring-ring/50 inline-flex max-w-full min-w-0 cursor-default items-center gap-2 rounded-sm text-left outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <EngineIcon engine={engine} />
        <span className="truncate">{detail.title}</span>
      </HoverCardTrigger>
      <DetailCardContent
        aside={
          detail.raw ? (
            <span className="block max-w-32 truncate font-mono">
              {detail.raw}
            </span>
          ) : null
        }
        icon={<EngineIcon engine={engine} />}
        title={detail.title}
      >
        <dl className="flex flex-col">
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground text-xs">
              {tGeoShared("purpose")}
            </dt>
            <dd className="m-0 text-xs font-medium">
              {trafficLabels.purpose(entry.category)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground text-xs">{t("confidence")}</dt>
            <dd className="m-0 text-xs font-medium">
              {trafficLabels.confidence(entry.confidence)}
            </dd>
          </div>
        </dl>
      </DetailCardContent>
    </HoverCard>
  );
}

function TimestampCell({ value }: { value: string }) {
  const locale = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const isClient = useIsClient();
  // The viewer's time zone is only known in the browser, so the server
  // renders a placeholder instead of a UTC time that flips on hydration.
  const parts = isClient ? formatCitationTimestamp(value, locale, now) : null;

  if (!isClient) {
    return (
      <span aria-hidden="true" className="text-muted-foreground">
        -
      </span>
    );
  }
  if (!parts) {
    return <span className="text-muted-foreground text-xs">{value}</span>;
  }
  return (
    <time
      className="flex items-baseline gap-1.5 text-xs whitespace-nowrap tabular-nums"
      dateTime={parts.iso}
      title={parts.full}
    >
      {parts.date ? (
        <span className="text-muted-foreground">{parts.date}</span>
      ) : null}
      <span>{parts.time}</span>
    </time>
  );
}

function PageCell({ entry }: { entry: GeoTrafficLogEntry }) {
  const location = formatTrafficLocation(entry.host, entry.path);
  return (
    <TruncateWithTooltip className="font-mono text-xs" tooltip={location}>
      {entry.host ? (
        <span className="text-muted-foreground">{entry.host}</span>
      ) : null}
      {location.slice(entry.host.length)}
    </TruncateWithTooltip>
  );
}

function MarkdownBadge() {
  const tCommon = useTranslations("common");
  return (
    <Badge
      aria-label={tCommon("labels.markdown")}
      className="px-1.5"
      variant="secondary"
    >
      <HugeiconsIcon
        className="size-3 shrink-0"
        icon={SourceCodeIcon}
        strokeWidth={2}
      />
    </Badge>
  );
}

function PurposeCell({ entry }: { entry: GeoTrafficLogEntry }) {
  const t = useTranslations("geo.citationsTable");
  const tCommon = useTranslations("common");
  const purposeIcon = AI_TRAFFIC_PURPOSE_ICONS[entry.category];
  const trafficLabels = useAiTrafficLabels();
  const purposeLabel = trafficLabels.purpose(entry.category);
  const purposeDescription = trafficLabels.purposeDescription(entry.category);

  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <button
            aria-label={
              entry.wantsMarkdown
                ? t("purposeMarkdownShowDetails", { purpose: purposeLabel })
                : t("purposeShowDetails", { purpose: purposeLabel })
            }
            className="focus-visible:ring-ring/50 flex items-center gap-1 rounded-sm outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <PurposeBadge category={entry.category} tooltip={false} />
        {entry.wantsMarkdown ? <MarkdownBadge /> : null}
      </HoverCardTrigger>
      <DetailCardContent
        icon={
          purposeIcon ? (
            <HugeiconsIcon
              aria-hidden="true"
              className="size-4 shrink-0"
              icon={purposeIcon}
              strokeWidth={2}
            />
          ) : null
        }
        title={purposeLabel}
      >
        <ul>
          <li className="px-3 py-1.5">
            <p className="text-muted-foreground text-xs text-pretty">
              {purposeDescription}
            </p>
          </li>
          {entry.wantsMarkdown ? (
            <li className="flex items-start gap-2 px-3 py-1.5">
              <HugeiconsIcon
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                icon={SourceCodeIcon}
                strokeWidth={2}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-xs font-medium">
                  {tCommon("labels.markdown")}
                </span>
                <span className="text-muted-foreground text-xs text-pretty">
                  {t("markdownHint")}
                </span>
              </span>
            </li>
          ) : null}
        </ul>
      </DetailCardContent>
    </HoverCard>
  );
}

const CITATIONS_DEFAULT_SORT = {
  key: "capturedAt",
  direction: "desc",
} as const;

export function CitationsTable({
  entries,
  height,
  liveKey,
  loading = false,
}: CitationsTableProps) {
  const t = useTranslations("geo.citationsTable");
  const tGeoShared = useTranslations("geo.shared");
  const trafficLabels = useAiTrafficLabels();
  const locale = useLocale();
  const rowIds = useMemo(() => citationRowIds(entries), [entries]);
  // Adjusted during render ("state from previous props") so the render that
  // shows new rows already marks them.
  const [known, setKnown] = useState<{
    key: string | undefined;
    ids: ReadonlySet<string>;
  }>(() => ({ key: liveKey, ids: new Set(rowIds.values()) }));
  const [arrivedIds, setArrivedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const currentIds = new Set(rowIds.values());
  const idsChanged =
    currentIds.size !== known.ids.size ||
    [...currentIds].some((id) => !known.ids.has(id));
  // A placeholder (no key) waits for its result. A result of another query,
  // such as a relaxed filter, brings older rows that did not just arrive.
  if (liveKey !== undefined && (idsChanged || liveKey !== known.key)) {
    setArrivedIds(
      liveKey === known.key
        ? arrivedCitationRowIds(known.ids, currentIds)
        : new Set()
    );
    setKnown({ key: liveKey, ids: currentIds });
  }
  // The log is virtualized: a row scrolled back into view remounts and would
  // replay its arrival, so the mark comes off once the animation is over.
  useEffect(() => {
    if (arrivedIds.size === 0) {
      return;
    }
    const clear = setTimeout(
      () => setArrivedIds(new Set()),
      GEO_LOG_ARRIVE_ANIMATION_MS
    );
    return () => clearTimeout(clear);
  }, [arrivedIds]);
  const rowId = (entry: GeoTrafficLogEntry, index: number) =>
    rowIds.get(entry) ?? String(index);
  // Position among this update's arrivals, in table order, for the stagger.
  const arrivalOrder = new Map<string, number>();
  for (const id of rowIds.values()) {
    if (arrivedIds.has(id)) {
      arrivalOrder.set(id, arrivalOrder.size);
    }
  }
  const columns: TableColumn<GeoTrafficLogEntry>[] = [
    {
      key: "capturedAt",
      header: t("columns.when"),
      width: "8.5rem",
      sortable: true,
      sortValue: (entry) => entry.capturedAt,
      cell: (entry) => <TimestampCell value={entry.capturedAt} />,
    },
    {
      key: "source",
      header: tGeoShared("provider"),
      width: "13rem",
      sortable: true,
      sortValue: (entry) => formatCitationProvider(entry.agent, entry.source),
      cell: (entry) => (
        <span className="text-sm font-medium">
          <ProviderCell entry={entry} />
        </span>
      ),
    },
    {
      key: "path",
      header: tGeoShared("page"),
      width: "1fr",
      cell: (entry) => <PageCell entry={entry} />,
    },
    {
      key: "category",
      header: tGeoShared("purpose"),
      width: GEO_PURPOSE_COLUMN_WIDTH,
      collapsePriority: 1,
      sortable: true,
      sortValue: (entry) => trafficLabels.purpose(entry.category),
      cell: (entry) => <PurposeCell entry={entry} />,
    },
    {
      key: "country",
      header: tGeoShared("country"),
      width: "10.5rem",
      collapsePriority: 2,
      sortable: true,
      sortValue: (row) => countryName(row.country, locale),
      cell: (row) =>
        row.country ? (
          <span className="flex min-w-0 items-center gap-2">
            <CountryFlag className="size-4 shrink-0" code={row.country} />
            <span className="truncate">{countryName(row.country, locale)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={entries}
      defaultSort={CITATIONS_DEFAULT_SORT}
      getRowClassName={(entry) => {
        const order = arrivalOrder.get(rowId(entry, -1));
        return order === undefined
          ? undefined
          : `geo-log-row-arrive geo-log-arrive-${Math.min(order, GEO_LOG_ARRIVE_STAGGER_STEPS)}`;
      }}
      getRowId={rowId}
      height={height}
      loading={loading}
      resizable
      rowHeight={GEO_CITATIONS_ROW_HEIGHT}
    />
  );
}
