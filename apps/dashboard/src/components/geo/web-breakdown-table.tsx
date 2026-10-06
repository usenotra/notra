"use client";

import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { InstrumentSection } from "@notra/ui/components/instrument/instrument-module";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useLocale, useTranslations } from "use-intl";

import { WEB_TABLE_ROW_HEIGHT } from "@/constants/web-analytics";
import type { WebBreakdownRow, WebBreakdownTableProps } from "@/types/geo";
import { formatChartInteger } from "@/utils/geo-charts";
import { webTableHeight } from "@/utils/web-analytics";

export function WebBreakdownTable({
  title,
  nameHeader,
  valueHeader,
  rows,
  showFromAi = false,
}: WebBreakdownTableProps) {
  const t = useTranslations("geo.webVisitors");
  const locale = useLocale();
  const max = Math.max(...rows.map((row) => row.value), 1);
  const columns: TableColumn<WebBreakdownRow>[] = [
    {
      key: "name",
      header: nameHeader,
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {row.label}
        </span>
      ),
      sortValue: (row) => row.sortLabel,
    },
  ];
  if (showFromAi) {
    columns.push({
      key: "fromAi",
      header: t("columnFromAi"),
      width: "5.5rem",
      align: "right",
      sortable: true,
      collapsePriority: 1,
      cell: (row) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.fromAi ? formatChartInteger(row.fromAi, locale) : "-"}
        </span>
      ),
      sortValue: (row) => row.fromAi ?? 0,
    });
  }
  columns.push({
    key: "value",
    header: valueHeader,
    width: "9rem",
    sortable: true,
    cell: (row) => (
      <span className="flex items-center gap-2">
        <GeoBar className="w-14 shrink-0" max={max} value={row.value} />
        <span className="text-sm tabular-nums">
          {formatChartInteger(row.value, locale)}
        </span>
      </span>
    ),
    sortValue: (row) => row.value,
  });
  return (
    <InstrumentSection eyebrow={title}>
      <DataTable
        columns={columns}
        data={rows}
        defaultSort={{ key: "value", direction: "desc" }}
        emptyState={t("noData")}
        getRowId={(row) => row.key}
        height={webTableHeight(rows.length)}
        rowHeight={WEB_TABLE_ROW_HEIGHT}
        scrollFade={false}
      />
    </InstrumentSection>
  );
}
