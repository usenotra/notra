"use client";

import { Files01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { GeoJourneyPageStats } from "@notra/geo-core/types/geo";
import { trafficVisitDelta } from "@notra/geo-core/utils/ai-traffic";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { JourneyCountCell } from "@/components/geo/journey-count-cell";
import { JourneyStatCard } from "@/components/geo/journey-stat-card";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { JourneyPageKindStat, JourneyPathsCardProps } from "@/types/geo";
import {
  journeyPageKindCounts,
  journeyPageKindStats,
} from "@/utils/geo-journey";
import { tableHeightFor } from "@/utils/table";

const pathRowId = (row: GeoJourneyPageStats) => row.path;

export function JourneyPathsCard({
  pages,
  failed,
  totalPages,
  previousTotalPages,
  previewRows,
  onOpenPath,
  loading = false,
}: JourneyPathsCardProps) {
  const t = useTranslations("geo.journeyPathsCard");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const kindLabels: Record<JourneyPageKindStat["kind"], string> = {
    docs: tGeoShared("docs"),
    blog: tCommon("labels.posts"),
    other: tCommon("labels.other"),
  };
  const kindCounts = useMemo(() => journeyPageKindCounts(pages), [pages]);
  const sampled = totalPages > pages.length;
  const columns: TableColumn<GeoJourneyPageStats>[] = [
    {
      key: "path",
      header: tGeoShared("page"),
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-sm">
          {row.path}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "journeys",
      header: tCommon("labels.journeys"),
      width: "9.5rem",
      align: "right",
      sortable: true,
      cell: (row) => (
        <JourneyCountCell
          journeys={row.journeys}
          label={row.path}
          previousJourneys={row.previousJourneys}
        />
      ),
    },
  ];

  return (
    <JourneyStatCard
      caption={
        sampled
          ? t("captionSampled", { count: totalPages, shown: pages.length })
          : t("caption", { count: totalPages })
      }
      delta={trafficVisitDelta(totalPages, previousTotalPages)}
      emptyMessage={failed ? t("loadFailed") : t("empty")}
      emptyDescription={failed ? undefined : t("emptyDescription")}
      emptyMedia={
        failed ? undefined : (
          <HugeiconsIcon icon={Files01Icon} className="size-5" />
        )
      }
      emptySeed="geo-journey-paths"
      eyebrow={tGeoShared("fetchedPages")}
      stats={journeyPageKindStats(kindCounts, totalPages).map((stat) => ({
        label: kindLabels[stat.kind],
        value: tGeoShared("countPluralOnePageOther", { count: stat.pages }),
      }))}
      total={totalPages}
    >
      <Table
        className="rounded-2xl"
        columns={columns}
        data={pages}
        defaultSort={{ key: "journeys", direction: "desc" }}
        getRowId={pathRowId}
        height={tableHeightFor(previewRows)}
        loading={loading}
        onRowClick={onOpenPath}
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </JourneyStatCard>
  );
}
