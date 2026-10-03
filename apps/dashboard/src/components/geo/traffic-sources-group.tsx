"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import {
  DEFAULT_MIN_COLUMN_WIDTH,
  TABLE_FRAME_INSET,
} from "@notra/ui/constants/table";
import { useCollapsibleColumns } from "@notra/ui/hooks/use-collapsible-columns";
import { tableMinWidthCss } from "@notra/ui/lib/data-table";
import { useTranslations } from "next-intl";

import {
  TRAFFIC_SOURCE_BAND_LABEL_KEYS,
  TRAFFIC_SOURCE_BANDS,
  TRAFFIC_SOURCE_COLLAPSED_BORDER_PX,
  TRAFFIC_SOURCE_STACK_OVERLAP_PX,
  TRAFFIC_SOURCE_STACK_Z_INDEX,
} from "@/constants/geo-traffic-sources";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { cn } from "@/lib/utils";
import type {
  GeoTrafficSourceGroup,
  TrafficSourcesGroupProps,
  TrafficSourcesStackProps,
} from "@/types/geo";
import { trafficGroupKey } from "@/utils/ai-traffic-groups";
import { paginatedTableHeightFor } from "@/utils/table";

function TrafficSourcesGroup({
  band,
  groups,
  columns,
  collapsed,
  followedByStack = false,
  onToggle,
  onOpen,
  stacked,
  loading = false,
}: TrafficSourcesGroupProps) {
  const t = useTranslations("geo.trafficSourcesGroup");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const label = tGeoShared(TRAFFIC_SOURCE_BAND_LABEL_KEYS[band]);
  const count = groups.length;
  const countLabel =
    band === "crawler"
      ? tGeoShared("countPluralOneBotOther", { count })
      : tCommon("messages.countPluralOneSourceOther", { count });
  const isEmpty = count === 0;
  const showTable = !(collapsed || isEmpty);

  const header = (
    <span className="flex min-w-max items-center gap-2">
      <button
        aria-expanded={showTable}
        aria-label={
          showTable ? t("collapse", { label }) : t("expand", { label })
        }
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md outline-hidden transition-colors focus-visible:ring-[3px] disabled:cursor-default disabled:opacity-40"
        disabled={isEmpty}
        onClick={onToggle}
        type="button"
      >
        <HugeiconsIcon
          className={cn(
            "transition-transform duration-200 ease-out",
            showTable && "rotate-90"
          )}
          icon={ArrowRight01Icon}
          size={14}
        />
      </button>
      <span className="text-foreground shrink-0 text-sm font-semibold">
        {label}
      </span>
      <span className="text-muted-foreground shrink-0 text-xs font-normal tabular-nums">
        {countLabel}
      </span>
    </span>
  );

  const [first, ...rest] = columns;
  const groupColumns: TableColumn<GeoTrafficSourceGroup>[] =
    first === undefined
      ? columns
      : [{ ...first, header, sortable: false }, ...rest];

  const collapsedBar = (
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
          TRAFFIC_SOURCE_COLLAPSED_BORDER_PX +
          (stacked ? TRAFFIC_SOURCE_STACK_OVERLAP_PX : 0),
        zIndex: TRAFFIC_SOURCE_STACK_Z_INDEX[band],
      }}
    >
      {header}
    </div>
  );

  const table = (
    <div
      className={cn("relative", stacked && "-mt-5")}
      style={{ zIndex: TRAFFIC_SOURCE_STACK_Z_INDEX[band] }}
    >
      <DataTable
        columns={groupColumns}
        data={groups}
        defaultSort={{ key: "visits", direction: "desc" }}
        emptyState={tGeoShared("noAiTrafficCapturedYet")}
        flushTop={stacked}
        getRowId={(row) => trafficGroupKey(row.band, row.key)}
        // Uncapped so no band scrolls on its own: a scrollbar would shift its
        // columns out of line with the bands stacked above and below.
        height={paginatedTableHeightFor(count)}
        loading={loading}
        onRowClick={onOpen}
        overlapTop={stacked} // pairs with -mt-5 so the stacked header is not clipped
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
      />
    </div>
  );

  return showTable ? table : collapsedBar;
}

export function TrafficSourcesStack({
  groups,
  columns,
  collapsed,
  onToggle,
  onOpen,
  loading = false,
}: TrafficSourcesStackProps) {
  const lastIndex = TRAFFIC_SOURCE_BANDS.length - 1;
  // Collapse once for the whole stack so every band keeps the same columns.
  // Bands are framed, so reserve the rim or an expanded band scrolls on its
  // own while the collapsed bars next to it do not.
  const { containerRef, visibleColumns } = useCollapsibleColumns(columns, {
    minColumnWidth: DEFAULT_MIN_COLUMN_WIDTH,
    extraFixedWidths: [TABLE_FRAME_INSET],
  });
  const minWidth = tableMinWidthCss(visibleColumns, DEFAULT_MIN_COLUMN_WIDTH, [
    TABLE_FRAME_INSET,
  ]);

  return (
    <div className="isolate min-w-0 overflow-x-auto" ref={containerRef}>
      <div className="w-full" style={{ minWidth }}>
        {TRAFFIC_SOURCE_BANDS.map((band, index) => (
          <TrafficSourcesGroup
            band={band}
            collapsed={collapsed.has(band)}
            columns={visibleColumns}
            followedByStack={index < lastIndex}
            groups={groups.filter((group) => group.band === band)}
            key={band}
            loading={loading}
            onOpen={onOpen}
            onToggle={() => onToggle(band)}
            stacked={index > 0}
          />
        ))}
      </div>
    </div>
  );
}
