"use client";

import { GEO_SPARKLINE_MIN_POINTS } from "@notra/geo-core/constants/geo";
import type {
  GeoTrafficSource,
  GeoVisitorType,
} from "@notra/geo-core/types/geo";
import {
  formatAiTrafficTimestamp,
  formatGeoAgent,
  formatGeoSource,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import { resolveEngineIconKey } from "@notra/geo-core/utils/geo-engine-icon";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { DailyTrendChart } from "@/components/geo/daily-trend-chart";
import { SheetStatGrid } from "@/components/geo/sheet-stat-grid";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { Table, type TableColumn } from "@/components/motion/table";
import { AI_TRAFFIC_PURPOSE_LABEL_KEYS } from "@/constants/ai-traffic-purposes";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  GeoTrafficGroupPage,
  SheetStat,
  TrafficSourceSheetContentProps,
  TrafficSourceSheetProps,
} from "@/types/geo";
import {
  trafficGroupPreviousVisits,
  trafficGroupTopPages,
  trafficVisitShare,
} from "@/utils/ai-traffic-groups";
import { aiTrafficPurposeKey } from "@/utils/ai-traffic-purpose";
import { tableHeightFor } from "@/utils/table";

const TOP_PAGES_LIMIT = 10;
const SHEET_TABLE_MAX_ROWS = 6;

function memberColumns(
  total: number,
  visitorType: GeoVisitorType,
  labels: {
    bot: string;
    source: string;
    purpose: string;
    visits: string;
    lastSeen: string;
    purposeLabel: (category: string) => string;
  },
  locale: string
): TableColumn<GeoTrafficSource>[] {
  const isCrawler = visitorType === "crawler";
  return [
    {
      key: "agent",
      header: isCrawler ? labels.bot : labels.source,
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <TrafficSourceGroupIcon
            className="size-3.5"
            group={{
              key: row.source,
              label: row.source,
              icon: resolveEngineIconKey(row.source) ? row.source : null,
            }}
          />
          <span className="truncate">
            {isCrawler
              ? formatGeoAgent(row.agent || row.source)
              : formatGeoSource(row.source)}
          </span>
        </span>
      ),
    },
    {
      key: "category",
      header: labels.purpose,
      width: "9rem",
      cell: (row) => (
        <span className="text-muted-foreground truncate text-xs">
          {labels.purposeLabel(row.category)}
        </span>
      ),
    },
    {
      key: "visits",
      header: labels.visits,
      width: "7.5rem",
      align: "right",
      cell: (row) => (
        <span className="flex items-baseline justify-end gap-2 tabular-nums">
          <span className="text-sm">{row.visits.toLocaleString(locale)}</span>
          <span className="text-muted-foreground text-xs">
            {trafficVisitShare(row.visits, total)}
          </span>
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: labels.lastSeen,
      width: "8.5rem",
      cell: (row) => (
        <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
          {formatAiTrafficTimestamp(row.lastSeenAt, locale)}
        </span>
      ),
    },
  ];
}

function pageColumns(
  labels: {
    page: string;
    visits: string;
  },
  locale: string
): TableColumn<GeoTrafficGroupPage>[] {
  return [
    {
      key: "path",
      header: labels.page,
      width: "1fr",
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-xs">
          {`${row.host}${row.path}`}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "visits",
      header: labels.visits,
      width: "6rem",
      align: "right",
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.visits.toLocaleString(locale)}
        </span>
      ),
    },
  ];
}

function formatShare(part: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;
}

function TrafficSourceSheetContent({
  group,
  series,
  pages,
}: TrafficSourceSheetContentProps) {
  const t = useTranslations("geo.trafficSourceSheet");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const purposeLabel = (category: string) => {
    const key = aiTrafficPurposeKey(category);
    return key === null
      ? category
      : tGeoShared(AI_TRAFFIC_PURPOSE_LABEL_KEYS[key]);
  };
  const previous = trafficGroupPreviousVisits(group);
  const topPages = trafficGroupTopPages(pages, group, TOP_PAGES_LIMIT);
  const showMarkdown = group.band !== "ai_referral";
  const stats: SheetStat[] = [
    {
      label: tGeoShared("visits"),
      value: group.visits.toLocaleString(locale),
      delta:
        previous === null ? null : trafficVisitDelta(group.visits, previous),
    },
    { label: tGeoShared("pages"), value: group.paths.toLocaleString(locale) },
    showMarkdown
      ? {
          label: tCommon("labels.markdown"),
          value: formatShare(group.markdownVisits, group.visits),
        }
      : {
          label:
            group.visitorType === "crawler"
              ? t("bots")
              : tCommon("labels.sources"),
          value: group.members.length.toLocaleString(locale),
        },
  ];
  const members = [...group.members].sort(
    (left, right) => right.visits - left.visits
  );

  return (
    <>
      <SheetHeader className="bg-muted/50 shrink-0 gap-1.5 border-b pr-14">
        <SheetTitle className="flex min-w-0 items-center gap-2 text-base leading-snug">
          <TrafficSourceGroupIcon group={group} />
          <span className="min-w-0 truncate">{group.label}</span>
          <Badge variant="secondary">
            {group.band === "cited"
              ? t("bands.cited")
              : tGeoShared(group.band === "crawler" ? "crawler" : "aiReferral")}
          </Badge>
        </SheetTitle>
        <SheetDescription>
          {tGeoShared("lastSeenTime", {
            time: formatAiTrafficTimestamp(group.lastSeenAt, locale),
          })}
        </SheetDescription>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <SheetStatGrid stats={stats} />

        {series.length >= GEO_SPARKLINE_MIN_POINTS ? (
          <section className="space-y-3">
            <h3 className="text-sm font-medium">{t("visitsPerDay")}</h3>
            <DailyTrendChart label={tGeoShared("visits")} points={series} />
          </section>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-medium">
            {group.visitorType === "crawler"
              ? t("bots")
              : tCommon("labels.sources")}
          </h3>
          <Table
            className="rounded-2xl"
            columns={memberColumns(
              group.visits,
              group.visitorType,
              {
                bot: t("bot"),
                source: tCommon("labels.source"),
                purpose: tGeoShared("purpose"),
                visits: tGeoShared("visits"),
                lastSeen: tGeoShared("lastSeen"),
                purposeLabel,
              },
              locale
            )}
            data={members}
            getRowId={(row) => `${row.source}-${row.visitorType}`}
            height={tableHeightFor(
              Math.min(members.length, SHEET_TABLE_MAX_ROWS)
            )}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium">{t("topPages")}</h3>
          <Table
            className="rounded-2xl"
            columns={pageColumns(
              { page: tGeoShared("page"), visits: tGeoShared("visits") },
              locale
            )}
            data={topPages}
            // `pages` is the site-wide busiest-pages list, so a quiet source can
            // contribute none of them even though it did visit pages.
            emptyState={
              group.paths > 0 ? t("pagesOutsideBusiest") : t("noPages")
            }
            getRowId={(row) => row.key}
            height={tableHeightFor(
              Math.min(topPages.length, SHEET_TABLE_MAX_ROWS)
            )}
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </section>
      </div>
    </>
  );
}

export function TrafficSourceSheet({
  group: groupProp,
  series,
  pages,
  onOpenChange,
}: TrafficSourceSheetProps) {
  // The parent drops the series the moment the sheet closes, so it travels with
  // the group and the visits chart survives the exit animation.
  const open = useMemo(
    () => (groupProp === null ? null : { group: groupProp, series }),
    [groupProp, series]
  );
  const [retained, release] = useRetainedValue(open);

  return (
    <Sheet
      onOpenChange={onOpenChange}
      onOpenChangeComplete={release}
      open={groupProp !== null}
    >
      <SheetContent className="gap-0 overflow-hidden rounded-2xl data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto data-[side=right]:w-[calc(100%-1rem)] data-[side=right]:border data-[side=right]:sm:max-w-2xl">
        {retained ? (
          <TrafficSourceSheetContent
            group={retained.group}
            pages={pages}
            series={retained.series}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
