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
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { useLocale, useTranslations, useNow } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { PurposeBadge } from "@/components/geo/purpose-badge";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import { CountryFlag } from "@/components/geo/twemoji";
import { Table, type TableColumn } from "@/components/motion/table";
import { AI_TRAFFIC_PURPOSE_ICONS } from "@/constants/geo-purpose-icons";
import { useAiTrafficLabels } from "@/lib/hooks/use-ai-traffic-labels";
import { useIsClient } from "@/lib/hooks/use-is-client";
import type { CitationsTableProps } from "@/types/geo";
import { countryName } from "@/utils/country";
import {
  citationProviderTooltip,
  citationRowId,
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
      </TrafficBreakdownCard>
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
      </TrafficBreakdownCard>
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
  loading = false,
}: CitationsTableProps) {
  const t = useTranslations("geo.citationsTable");
  const tGeoShared = useTranslations("geo.shared");
  const trafficLabels = useAiTrafficLabels();
  const locale = useLocale();
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
      getRowId={citationRowId}
      height={height}
      loading={loading}
      resizable
      rowHeight={GEO_CITATIONS_ROW_HEIGHT}
    />
  );
}
