"use client";

import type { GeoTrafficPage } from "@notra/geo-core/types/geo";
import { formatGeoSource } from "@notra/geo-core/utils/ai-traffic";
import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useFormatter, useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import { GEO_DIRECTIONS_PAGES } from "@/constants/geo-directions";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type { DirectionBlockProps } from "@/types/geo-directions";
import { tableHeightFor } from "@/utils/table";

export function DirectionPagesTable({ className }: DirectionBlockProps) {
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const columns: TableColumn<GeoTrafficPage>[] = [
    {
      key: "path",
      header: tGeoShared("page"),
      width: "1.5fr",
      sortable: true,
      cell: (row) => (
        <TruncateWithTooltip className="font-mono text-xs">
          {row.path}
        </TruncateWithTooltip>
      ),
    },
    {
      key: "source",
      header: tCommon("labels.source"),
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EngineIcon engine={row.source} />
          <span className="truncate">{formatGeoSource(row.source)}</span>
        </span>
      ),
      sortValue: (row) => formatGeoSource(row.source),
    },
    {
      key: "visits",
      header: tGeoShared("visits"),
      width: "6.5rem",
      sortable: true,
      cell: (row) => (
        <span className="text-sm tabular-nums">
          {format.number(row.visits)}
        </span>
      ),
    },
  ];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>
          {tGeoShared("countPluralOnePageOther", {
            count: GEO_DIRECTIONS_PAGES.length,
          })}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={[...GEO_DIRECTIONS_PAGES]}
        defaultSort={{ key: "visits", direction: "desc" }}
        emptyState={tGeoShared("noAiVisitsCapturedYet")}
        getRowId={(row) => row.path}
        height={tableHeightFor(GEO_DIRECTIONS_PAGES.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}
