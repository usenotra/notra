"use client";

import { SourceCodeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AI_TRAFFIC_PURPOSE_DESCRIPTIONS,
  AI_TRAFFIC_PURPOSE_LABELS,
  GEO_CITATIONS_ROW_HEIGHT,
  GEO_PURPOSE_COLUMN_WIDTH,
} from "@notra/geo-core/constants/geo";
import type { GeoTrafficLogEntry } from "@notra/geo-core/types/geo";
import { formatTrafficLocation } from "@notra/geo-core/utils/geo-project-domains";
import { TablePagination } from "@notra/ui/components/shared/table-pagination";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";

import { EngineIcon } from "@/components/geo/engine-icon";
import { PurposeBadge } from "@/components/geo/purpose-badge";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import { CountryFlag } from "@/components/geo/twemoji";
import { Table, type TableColumn } from "@/components/motion/table";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import { GEO_TRAFFIC_HOVER_DELAY_MS } from "@/constants/geo-traffic-hover";
import type { CitationsTableProps } from "@/types/geo";
import { countryName } from "@/utils/country";
import {
  citationProviderTooltip,
  citationRowId,
  formatCitationProvider,
  formatCitationTimestamp,
} from "@/utils/geo-citations";

function ProviderCell({ entry }: { entry: GeoTrafficLogEntry }) {
  const detail = citationProviderTooltip(entry);
  const engine = entry.agent || entry.source;
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={GEO_TRAFFIC_HOVER_DELAY_MS}
        render={
          <button
            aria-label={`${detail.title}, show details`}
            className="focus-visible:ring-ring/50 inline-flex max-w-full min-w-0 cursor-default items-center gap-2 rounded-sm text-left outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <EngineIcon engine={engine} />
        <span className="truncate">{detail.title}</span>
      </HoverCardTrigger>
      <TrafficBreakdownCard
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
            <dt className="text-muted-foreground text-xs">Purpose</dt>
            <dd className="m-0 text-xs font-medium">{detail.purpose}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground text-xs">Confidence</dt>
            <dd className="m-0 text-xs font-medium">{detail.confidence}</dd>
          </div>
        </dl>
      </TrafficBreakdownCard>
    </HoverCard>
  );
}

const MARKDOWN_HINT = "Asked for markdown via the Accept header";

function MarkdownBadge() {
  return (
    <Badge aria-label="Markdown" className="px-1.5" variant="secondary">
      <HugeiconsIcon
        className="size-3 shrink-0"
        icon={SourceCodeIcon}
        strokeWidth={2}
      />
    </Badge>
  );
}

function PurposeCell({ entry }: { entry: GeoTrafficLogEntry }) {
  const purposeIcon = AI_TRAFFIC_PURPOSE_ICONS[entry.category];
  const purposeLabel =
    AI_TRAFFIC_PURPOSE_LABELS[entry.category] ?? entry.category;
  const purposeDescription =
    AI_TRAFFIC_PURPOSE_DESCRIPTIONS[entry.category] ?? entry.category;

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={GEO_TRAFFIC_HOVER_DELAY_MS}
        render={
          <button
            aria-label={
              entry.wantsMarkdown
                ? `${purposeLabel}, requested markdown, show details`
                : `${purposeLabel}, show details`
            }
            className="focus-visible:ring-ring/50 flex items-center gap-1 rounded-sm outline-hidden focus-visible:ring-[3px]"
            type="button"
          />
        }
      >
        <PurposeBadge category={entry.category} tooltip={false} />
        {entry.wantsMarkdown ? <MarkdownBadge /> : null}
      </HoverCardTrigger>
      <TrafficBreakdownCard
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
                <span className="text-xs font-medium">Markdown</span>
                <span className="text-muted-foreground text-xs text-pretty">
                  {MARKDOWN_HINT}
                </span>
              </span>
            </li>
          ) : null}
        </ul>
      </TrafficBreakdownCard>
    </HoverCard>
  );
}

const CITATIONS_COLUMNS: TableColumn<GeoTrafficLogEntry>[] = [
  {
    key: "capturedAt",
    header: "When",
    width: "10.5rem",
    sortable: true,
    sortValue: (entry) => entry.capturedAt,
    cell: (entry) => (
      <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
        {formatCitationTimestamp(entry.capturedAt)}
      </span>
    ),
  },
  {
    key: "source",
    header: "Provider",
    width: "11rem",
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
    header: "Page",
    width: "1fr",
    cell: (entry) => (
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1">
          <TruncateWithTooltip className="font-mono text-xs">
            {formatTrafficLocation(entry.host, entry.path)}
          </TruncateWithTooltip>
        </span>
      </span>
    ),
  },
  {
    key: "category",
    header: "Purpose",
    width: GEO_PURPOSE_COLUMN_WIDTH,
    sortable: true,
    sortValue: (entry) =>
      AI_TRAFFIC_PURPOSE_LABELS[entry.category] ?? entry.category,
    cell: (entry) => <PurposeCell entry={entry} />,
  },
  {
    key: "country",
    header: "Country",
    width: "10.5rem",
    sortable: true,
    sortValue: (row) => countryName(row.country),
    cell: (row) =>
      row.country ? (
        <span className="flex min-w-0 items-center gap-2">
          <CountryFlag className="size-4 shrink-0" code={row.country} />
          <span className="truncate">{countryName(row.country)}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
];

const CITATIONS_DEFAULT_SORT = {
  key: "capturedAt",
  direction: "desc",
} as const;

export function CitationsTable({
  entries,
  height,
  loading = false,
  pagination,
}: CitationsTableProps) {
  return (
    <Table
      className="rounded-2xl"
      columns={CITATIONS_COLUMNS}
      data={entries}
      defaultSort={CITATIONS_DEFAULT_SORT}
      footer={
        pagination ? (
          <TablePagination {...pagination} itemLabel="requests" />
        ) : undefined
      }
      getRowId={citationRowId}
      height={height}
      loading={loading}
      onSortChange={pagination ? () => pagination.setPage(1) : undefined}
      page={pagination?.page}
      pageSize={pagination?.pageSize}
      resizable
      rowHeight={GEO_CITATIONS_ROW_HEIGHT}
    />
  );
}
