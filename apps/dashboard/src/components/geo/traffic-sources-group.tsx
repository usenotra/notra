"use client";

import { ArrowDown01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_TRAFFIC_MARKDOWN_COLUMN_KEY,
  GEO_TRAFFIC_TREND_CITED_LABEL,
  GEO_TRAFFIC_TREND_CRAWLER_LABEL,
  GEO_TRAFFIC_TREND_REFERRAL_LABEL,
} from "@notra/geo-core/constants/geo";

import { Table, type TableColumn } from "@/components/motion/table";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  GeoTrafficSourceBand,
  GeoTrafficSourceGroup,
  TrafficSourcesGroupProps,
} from "@/types/geo";
import { trafficGroupKey } from "@/utils/ai-traffic-groups";
import { tableHeightFor } from "@/utils/table";

const COLLAPSED_BAND_BORDER_PX = 2;
const STACK_OVERLAP_PX = 20;
const STACK_Z_INDEX: Record<GeoTrafficSourceBand, number> = {
  crawler: 30,
  cited: 20,
  ai_referral: 10,
};

const SOURCE_BAND_LABELS: Record<GeoTrafficSourceBand, string> = {
  crawler: GEO_TRAFFIC_TREND_CRAWLER_LABEL,
  cited: GEO_TRAFFIC_TREND_CITED_LABEL,
  ai_referral: GEO_TRAFFIC_TREND_REFERRAL_LABEL,
};

const SOURCE_BAND_NOUN: Record<GeoTrafficSourceBand, string> = {
  crawler: "bot",
  cited: "source",
  ai_referral: "source",
};

export function TrafficSourcesGroup({
  band,
  groups,
  columns,
  collapsed,
  followedByStack = false,
  onToggle,
  stacked,
}: TrafficSourcesGroupProps) {
  const label = SOURCE_BAND_LABELS[band];
  const noun = SOURCE_BAND_NOUN[band];
  const showMarkdown = band !== "ai_referral";
  const count = groups.length;
  const countLabel = `${count.toLocaleString()} ${count === 1 ? noun : `${noun}s`}`;
  const isEmpty = count === 0;
  const showTable = !(collapsed || isEmpty);

  const header = (
    <span className="flex items-center gap-2">
      <button
        aria-expanded={showTable}
        aria-label={`${showTable ? "Collapse" : "Expand"} ${label}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-1 flex size-6 cursor-pointer items-center justify-center rounded-md outline-hidden transition-colors focus-visible:ring-[3px] disabled:cursor-default disabled:opacity-40"
        disabled={isEmpty}
        onClick={onToggle}
        type="button"
      >
        <HugeiconsIcon
          icon={showTable ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
        />
      </button>
      <span className="text-foreground text-sm font-semibold">{label}</span>
      <span className="text-muted-foreground text-xs font-normal tabular-nums">
        {countLabel}
      </span>
    </span>
  );

  const [first, ...rest] = columns;
  const visibleRest = showMarkdown
    ? rest
    : rest.map((column) =>
        column.key === GEO_TRAFFIC_MARKDOWN_COLUMN_KEY
          ? { ...column, header: "", sortable: false, cell: () => null }
          : column
      );
  const groupColumns: TableColumn<GeoTrafficSourceGroup>[] =
    first === undefined
      ? columns
      : [{ ...first, header, sortable: false }, ...visibleRest];

  if (!showTable) {
    return (
      <div
        className={cn(
          "border-border bg-muted relative flex items-center border-x px-4",
          stacked ? "-mt-5 border-t-0 pt-5" : "border-t",
          followedByStack ? "rounded-t-2xl border-b-0" : "rounded-2xl border-b",
          stacked && "rounded-t-none"
        )}
        style={{
          height:
            TABLE_ROW_HEIGHT +
            COLLAPSED_BAND_BORDER_PX +
            (stacked ? STACK_OVERLAP_PX : 0),
          zIndex: STACK_Z_INDEX[band],
        }}
      >
        {header}
      </div>
    );
  }

  return (
    <div
      className={cn("relative", stacked && "-mt-5")}
      style={{ zIndex: STACK_Z_INDEX[band] }}
    >
      <Table
        className="min-w-0 rounded-2xl"
        columns={groupColumns}
        data={groups}
        defaultSort={{ key: "visits", direction: "desc" }}
        emptyState="No AI traffic captured yet"
        flushTop={stacked}
        getRowId={(row) => trafficGroupKey(row.band, row.key)}
        height={tableHeightFor(count)}
        overlapTop={stacked}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );
}
