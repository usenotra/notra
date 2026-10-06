"use client";

import { TruncateWithTooltip } from "@notra/ui/components/shared/truncate-with-tooltip";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { useMemo } from "react";
import { useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import {
  GEO_DIRECTIONS_POSITION_CLASS,
  GEO_DIRECTIONS_PROMPT_ENGINES,
  GEO_DIRECTIONS_PROMPTS,
} from "@/constants/geo-directions";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  DirectionPositionCellProps,
  GeoDirectionPrompt,
  PromptResultsTableProps,
} from "@/types/geo-directions";
import { directionPositionTone } from "@/utils/geo-directions";
import { tableHeightFor } from "@/utils/table";

function PositionCell({ position }: DirectionPositionCellProps) {
  const tGeoShared = useTranslations("geo.shared");

  if (position === null) {
    return (
      <span className="text-muted-foreground text-xs">
        {tGeoShared("notMentioned")}
      </span>
    );
  }

  return (
    <Badge
      className={cn(
        "rounded-sm tabular-nums",
        GEO_DIRECTIONS_POSITION_CLASS[directionPositionTone(position)]
      )}
      variant="outline"
    >
      #{position}
    </Badge>
  );
}

function positionFor(row: GeoDirectionPrompt, engine: string): number | null {
  return (
    row.positions.find((entry) => entry.engine === engine)?.position ?? null
  );
}

export function PromptResultsTable({ className }: PromptResultsTableProps) {
  const t = useTranslations("geo.directions.promptResultsTable");
  const tGeoShared = useTranslations("geo.shared");
  const columns = useMemo<TableColumn<GeoDirectionPrompt>[]>(
    () => [
      {
        key: "prompt",
        header: tGeoShared("prompt"),
        width: "1fr",
        sortable: true,
        cell: (row) => (
          <TruncateWithTooltip className="text-sm">
            {row.prompt}
          </TruncateWithTooltip>
        ),
      },
      ...GEO_DIRECTIONS_PROMPT_ENGINES.map<TableColumn<GeoDirectionPrompt>>(
        (engine) => ({
          key: engine.engine,
          header: (
            <span className="inline-flex items-center gap-1.5">
              <EngineIcon engine={engine.engine} />
              {engine.label}
            </span>
          ),
          width: "8.5rem",
          align: "center",
          sortable: true,
          cell: (row) => (
            <PositionCell position={positionFor(row, engine.engine)} />
          ),
          sortValue: (row) =>
            positionFor(row, engine.engine) ?? Number.MAX_SAFE_INTEGER,
        })
      ),
    ],
    [t]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
        <span>
          {tGeoShared("countPluralOnePromptOther", {
            count: GEO_DIRECTIONS_PROMPTS.length,
          })}
        </span>
      </div>
      <DataTable
        columns={columns}
        data={[...GEO_DIRECTIONS_PROMPTS]}
        emptyState={t("noResults")}
        getRowId={(row) => row.promptId}
        height={tableHeightFor(GEO_DIRECTIONS_PROMPTS.length)}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}
