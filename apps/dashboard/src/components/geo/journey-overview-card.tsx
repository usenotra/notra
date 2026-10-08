"use client";

import { Route01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_JOURNEY_DEEP_CRAWL_PAGES } from "@notra/geo-core/constants/geo";
import type { GeoJourneySourceStats } from "@notra/geo-core/types/geo";
import {
  formatGeoSource,
  trafficVisitDelta,
} from "@notra/geo-core/utils/ai-traffic";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { GeoCountCell } from "@/components/geo/geo-count-cell";
import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { GEO_COUNT_COLUMN_WIDTH } from "@/constants/geo-table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneyOverviewCardProps } from "@/types/geo";
import {
  formatJourneyShare,
  journeyAverageDepth,
  journeyTotals,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const sourceRowId = (row: GeoJourneySourceStats) =>
  `${row.source}-${row.visitorType}`;

export function JourneyOverviewCard({
  sources,
  failed,
  previewRows,
  onOpenSource,
  loading = false,
}: JourneyOverviewCardProps) {
  const t = useTranslations("geo.journeyOverviewCard");
  const tCommon = useTranslations("common");
  const tGeoShared = useTranslations("geo.shared");
  const totals = journeyTotals(sources);
  const columns: TableColumn<GeoJourneySourceStats>[] = [
    {
      key: "source",
      header: tCommon("labels.source"),
      width: "1fr",
      sortable: true,
      sortValue: (row) => formatGeoSource(row.source),
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
          <span className="text-muted-foreground shrink-0 text-xs">
            {row.visitorType === "crawler"
              ? tGeoShared("crawler")
              : tGeoShared("aiReferral")}
          </span>
        </span>
      ),
    },
    {
      key: "journeys",
      header: tCommon("labels.journeys"),
      width: GEO_COUNT_COLUMN_WIDTH,
      align: "right",
      sortable: true,
      cell: (row) => (
        <GeoCountCell
          value={row.journeys}
          label={formatGeoSource(row.source)}
          previousValue={row.previousJourneys}
        />
      ),
    },
  ];

  return (
    <JourneyStatCard
      caption={t("caption", { count: totals.journeys })}
      delta={trafficVisitDelta(totals.journeys, totals.previousJourneys)}
      emptyMessage={failed ? t("loadFailed") : t("empty")}
      emptyDescription={failed ? undefined : t("emptyDescription")}
      emptyMedia={
        failed ? undefined : (
          <HugeiconsIcon icon={Route01Icon} className="size-5" />
        )
      }
      emptySeed="geo-journey-overview"
      eyebrow={tCommon("labels.journeys")}
      stats={[
        {
          label: tGeoShared("avgDepth"),
          value: tGeoShared("countPluralOnePageOther", {
            count: journeyAverageDepth(totals.pages, totals.journeys),
          }),
        },
        {
          label: t("stats.singleFetch"),
          value: formatJourneyShare(totals.singleFetch, totals.journeys),
        },
        {
          label: tGeoShared("crawledPagesPages", {
            pages: GEO_JOURNEY_DEEP_CRAWL_PAGES,
          }),
          value: formatJourneyShare(totals.deepCrawls, totals.journeys),
        },
      ]}
      total={totals.journeys}
    >
      <DataTable
        columns={columns}
        data={sources.filter((row) => row.journeys > 0)}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={sourceRowId}
        height={tableHeightFor(previewRows)}
        loading={loading}
        onRowClick={onOpenSource}
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </JourneyStatCard>
  );
}
