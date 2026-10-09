"use client";

import type { WebAnalyticsOutcome } from "@notra/geo-core/types/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useLocale, useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { WebAnalyticsEmpty } from "@/components/geo/web-analytics-empty";
import { WEB_TABLE_ROW_HEIGHT } from "@/constants/web-analytics";
import type { WebOutcomesTableProps } from "@/types/geo";
import { webTableHeight } from "@/utils/web-analytics";

export function WebOutcomesTable({ outcomes }: WebOutcomesTableProps) {
  const t = useTranslations("geo.webVisitors");
  const locale = useLocale();
  const rows = outcomes.filter((row) => row.sessions > 0);
  const columns: TableColumn<WebAnalyticsOutcome>[] = [
    {
      key: "source",
      header: t("columnSource"),
      width: "1fr",
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {row.source ? (
            <EngineIcon className="size-3.5" engine={row.source} />
          ) : null}
          <span className="truncate">
            {row.source ? formatGeoSource(row.source) : t("outcomesAll")}
          </span>
        </span>
      ),
    },
    {
      key: "pages",
      header: t("pagesPerSession"),
      width: "10rem",
      align: "right",
      collapsePriority: 1,
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {row.pagesPerSession.toLocaleString(locale, {
            maximumFractionDigits: 1,
          })}
        </span>
      ),
    },
    {
      key: "engaged",
      header: t("engagedRate"),
      width: "8rem",
      align: "right",
      collapsePriority: 2,
      cell: (row) => (
        <span className="flex w-full items-center justify-between gap-2">
          <GeoBar className="w-10 shrink-0" value={row.engagedRate} />
          <span className="text-sm tabular-nums">
            {row.engagedRate.toLocaleString(locale, {
              style: "percent",
              maximumFractionDigits: 0,
            })}
          </span>
        </span>
      ),
    },
  ];
  return (
    <InstrumentSection eyebrow={t("outcomesTitle")}>
      <DataTable
        columns={columns}
        data={rows}
        emptyState={<WebAnalyticsEmpty />}
        getRowId={(row) => row.source || "all"}
        height={webTableHeight(rows.length)}
        rowHeight={WEB_TABLE_ROW_HEIGHT}
        scrollFade={false}
      />
    </InstrumentSection>
  );
}
