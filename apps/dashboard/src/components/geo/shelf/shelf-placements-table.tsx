"use client";

import { Link04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GEO_SHELF_PLACEMENT_STATUSES } from "@notra/schemas/constants/dashboard/geo-shelf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@notra/ui/components/ui/select";

import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { ShelfPlacementMark } from "@/components/geo/shelf/shelf-placement-badge";
import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  GeoShelfPlacement,
  GeoShelfPlacementStatus,
  GeoShelfPlacementsTableProps,
} from "@/types/geo-shelf";
import { tableHeightFor } from "@/utils/table";

function toPlacementStatus(value: string): GeoShelfPlacementStatus {
  return (
    GEO_SHELF_PLACEMENT_STATUSES.find((status) => status === value) ?? "unknown"
  );
}

export function ShelfPlacementsTable({
  row,
  ownBrandName,
  onSetPlacementStatus,
  disabled,
}: GeoShelfPlacementsTableProps) {
  const placements = [
    ...(row.ownPlacement ? [row.ownPlacement] : []),
    ...row.competitorPlacements,
  ];

  const columns: TableColumn<GeoShelfPlacement>[] = [
    {
      key: "brandName",
      header: "Brand",
      width: "1fr",
      minWidth: "12rem",
      cell: (placement) => {
        const isOwn = placement.competitorId === null;
        const brandName = isOwn
          ? ownBrandName || placement.brandName
          : placement.brandName;
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <CompetitorLogo
              className="size-5 shrink-0 rounded-md outline outline-black/10 dark:outline-white/10"
              domain={placement.brandDomain}
              name={placement.brandName}
            />
            <span className="truncate font-medium">
              {brandName}
              {isOwn ? (
                <span className="text-muted-foreground ml-1 font-normal">
                  (You)
                </span>
              ) : null}
            </span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: "On the page",
      width: "12rem",
      cell: (placement) => (
        <Select
          disabled={disabled}
          onValueChange={(value) =>
            onSetPlacementStatus(
              row.id,
              placement.competitorId,
              toPlacementStatus(value ?? "unknown")
            )
          }
          value={placement.status}
        >
          <SelectTrigger
            aria-label={`Presence of ${placement.brandName}`}
            className="w-40"
            size="sm"
          >
            <SelectValue>
              <ShelfPlacementMark status={placement.status} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GEO_SHELF_PLACEMENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                <ShelfPlacementMark status={status} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "position",
      header: "Position",
      width: "7rem",
      align: "right",
      cell: (placement) => (
        <span
          className={cn(
            "tabular-nums",
            !placement.position && "text-muted-foreground"
          )}
        >
          {placement.position ? `#${placement.position}` : "—"}
        </span>
      ),
    },
    {
      key: "hasLink",
      header: "Link",
      width: "8rem",
      cell: (placement) =>
        placement.hasLink ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <HugeiconsIcon className="size-3.5" icon={Link04Icon} />
            Outbound
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={placements}
      getRowId={(placement) => placement.competitorId ?? "own"}
      height={tableHeightFor(placements.length)}
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}
