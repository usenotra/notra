"use client";

import type { GeoTrafficSource } from "@notra/geo-core/types/geo";
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
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useMemo } from "react";
import { useLocale, useTranslations } from "use-intl";

import { TrafficSheetHero } from "@/components/geo/traffic-sheet-hero";
import { TrafficSourceGroupIcon } from "@/components/geo/traffic-source-group-icon";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { useTrafficSourceColumns } from "@/lib/hooks/use-traffic-source-columns";
import type {
  GeoTrafficGroupPage,
  GeoTrafficSourceGroup,
  SheetStat,
  TrafficSourceSheetContentProps,
  TrafficSourceSheetProps,
} from "@/types/geo";
import {
  trafficGroupKey,
  trafficGroupPreviousVisits,
  trafficGroupTopPages,
} from "@/utils/ai-traffic-groups";
import { paginatedTableHeightFor } from "@/utils/table";

const TOP_PAGES_LIMIT = 10;

/** A single bot as a one-member group, so it fits the overview's table columns. */
function botAsGroup(
  group: GeoTrafficSourceGroup,
  member: GeoTrafficSource
): GeoTrafficSourceGroup {
  return {
    key: `${member.source}-${member.visitorType}`,
    label:
      group.visitorType === "crawler"
        ? formatGeoAgent(member.agent || member.source)
        : formatGeoSource(member.source),
    icon: resolveEngineIconKey(member.source) ? member.source : null,
    visitorType: member.visitorType,
    band: group.band,
    visits: member.visits,
    markdownVisits: member.markdownVisits,
    paths: member.paths,
    lastSeenAt: member.lastSeenAt,
    categories: member.category ? [member.category] : [],
    members: [member],
  };
}

function pageColumns(
  labels: {
    pages: string;
    visits: string;
  },
  locale: string
): TableColumn<GeoTrafficGroupPage>[] {
  return [
    {
      key: "path",
      header: labels.pages,
      width: "1fr",
      minWidth: "8rem",
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
  const bots = useMemo(
    () =>
      [...group.members]
        .sort((left, right) => right.visits - left.visits)
        .map((member) => botAsGroup(group, member)),
    [group]
  );
  const botColumns = useTrafficSourceColumns({
    rowsAreBots: true,
    sourceHeader: t(
      group.visitorType === "crawler" ? "botsTitle" : "sourcesTitle",
      { count: bots.length }
    ),
  });

  return (
    <>
      <SheetHeader className="flex-row items-center gap-3 pr-14">
        <span className="bg-shell border-shell-border flex size-10 shrink-0 items-center justify-center rounded-xl border">
          <TrafficSourceGroupIcon className="size-5" group={group} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <SheetTitle className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate">{group.label}</span>
            <Badge variant="secondary">
              {group.band === "cited"
                ? t("bands.cited")
                : tGeoShared(
                    group.band === "crawler" ? "crawler" : "aiReferral"
                  )}
            </Badge>
          </SheetTitle>
          <SheetDescription className="tabular-nums">
            {tGeoShared("lastSeenTime", {
              time: formatAiTrafficTimestamp(group.lastSeenAt, locale),
            })}
          </SheetDescription>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 pt-2 pb-6">
        <TrafficSheetHero
          chartLabel={tGeoShared("visits")}
          chartTitle={t("visitsPerDay")}
          series={series}
          stats={stats}
        />

        <DataTable
          columns={botColumns}
          data={bots}
          getRowId={(row) => trafficGroupKey(row.band, row.key)}
          height={paginatedTableHeightFor(bots.length)}
          rowHeight={TABLE_ROW_HEIGHT}
        />

        <DataTable
          columns={pageColumns(
            {
              pages: t("pagesTitle", { count: topPages.length }),
              visits: tGeoShared("visits"),
            },
            locale
          )}
          data={topPages}
          // `pages` is the site-wide busiest-pages list, so a quiet source can
          // contribute none of them even though it did visit pages.
          emptyState={group.paths > 0 ? t("pagesOutsideBusiest") : t("noPages")}
          getRowId={(row) => row.key}
          height={paginatedTableHeightFor(topPages.length)}
          rowHeight={TABLE_ROW_HEIGHT}
        />
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
      <SheetContent variant="inset">
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
