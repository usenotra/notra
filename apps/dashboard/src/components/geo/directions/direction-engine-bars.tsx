"use client";

import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { GEO_DIRECTIONS_ENGINES } from "@/constants/geo-directions";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  DirectionBlockProps,
  GeoDirectionEngineRow,
} from "@/types/geo-directions";
import { formatMentionRate } from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const MAX_RATE = 1;

export function DirectionEngineBars({ className }: DirectionBlockProps) {
  const t = useTranslations("geo.directions.labels");
  const tGeoShared = useTranslations("geo.shared");
  const columns = useMemo<TableColumn<GeoDirectionEngineRow>[]>(
    () => [
      {
        key: "label",
        header: tGeoShared("engine"),
        width: "1fr",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <EngineIcon engine={row.engine} />
            <span className="truncate">{row.label}</span>
          </span>
        ),
      },
      {
        key: "bar",
        header: t("mentionRate"),
        width: "1.4fr",
        cell: (row) => <GeoBar max={MAX_RATE} value={row.rate} />,
        sortValue: (row) => row.rate,
      },
      {
        key: "rate",
        header: t("rate"),
        width: "6rem",
        sortable: true,
        cell: (row) => (
          <span className="text-sm tabular-nums">
            {formatMentionRate(row.rate)}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>
          {t("enginesCount", { count: GEO_DIRECTIONS_ENGINES.length })}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={[...GEO_DIRECTIONS_ENGINES]}
        defaultSort={{ key: "rate", direction: "desc" }}
        emptyState={t("noEngines")}
        getRowId={(row) => row.engine}
        height={tableHeightFor(GEO_DIRECTIONS_ENGINES.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}
