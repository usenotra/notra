"use client";

import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";
import {
  GEO_WRITE_BRIEF_STATUS_LABELS,
  GEO_WRITE_TABLE_HEIGHT,
  GEO_WRITE_TABLE_MIN_ROWS,
  GEO_WRITE_TABLE_ROW_HEIGHT,
} from "@notra/geo-core/constants/geo";
import type { GeoContentBriefSummary } from "@notra/geo-core/types/geo";
import { Badge } from "@notra/ui/components/ui/badge";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { StatusSpinner } from "@/components/geo/status-spinner";
import { Table, type TableColumn } from "@/components/motion/table";
import type { BriefHistoryProps } from "@/types/components/geo-writer";
import { formatRelativeDate } from "@/utils/content-preview";
import { briefDisplayTitle } from "@/utils/geo-write-entry";

function statusVariant(
  status: GeoContentBriefStatus
): "secondary" | "destructive" | "outline" {
  if (status === "completed") {
    return "secondary";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "outline";
}

function BriefStatusBadge({ status }: { status: GeoContentBriefStatus }) {
  return (
    <Badge
      className="inline-flex items-center gap-1.5 rounded-sm text-[0.6875rem] whitespace-nowrap"
      variant={statusVariant(status)}
    >
      {status === "writing" ? <StatusSpinner /> : null}
      {GEO_WRITE_BRIEF_STATUS_LABELS[status]}
    </Badge>
  );
}

function remainingTableHeight(element: HTMLElement): number {
  const elementTop = element.getBoundingClientRect().top;
  const page = element.closest("[data-geo-write-page]");
  const pagePadding =
    page instanceof HTMLElement
      ? Number.parseFloat(getComputedStyle(page).paddingBottom)
      : Number.NaN;
  const inset = Number.isFinite(pagePadding) ? pagePadding : 24;

  if (!(page instanceof HTMLElement)) {
    return 0;
  }

  return page.getBoundingClientRect().bottom - inset - elementTop;
}

function useFillHeight(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(fallback);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const update = () => {
      const next = Math.floor(remainingTableHeight(element));
      if (next > 0) {
        setHeight((current) => (current === next ? current : next));
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const page = element.closest("[data-geo-write-page]");
    if (page instanceof HTMLElement) {
      observer.observe(page);
    }
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return [ref, height] as const;
}

export function BriefHistory({
  briefs,
  activeBriefId,
  onOpen,
  onHover,
  loading = false,
}: BriefHistoryProps) {
  const [tableRef, tableHeight] = useFillHeight(GEO_WRITE_TABLE_HEIGHT);
  const tableBodyHeight = Math.min(
    tableHeight,
    Math.max(
      briefs.length * GEO_WRITE_TABLE_ROW_HEIGHT,
      GEO_WRITE_TABLE_ROW_HEIGHT * GEO_WRITE_TABLE_MIN_ROWS
    )
  );

  const columns = useMemo<TableColumn<GeoContentBriefSummary>[]>(
    () => [
      {
        key: "article",
        header: "Article",
        width: "1fr",
        sortable: true,
        sortValue: (brief) => briefDisplayTitle(brief),
        cell: (brief) => {
          const title = briefDisplayTitle(brief);
          const subtitle = brief.topic !== title ? brief.topic : null;
          return (
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm leading-snug font-medium">
                {title}
              </span>
              {subtitle ? (
                <span className="text-muted-foreground truncate text-xs">
                  {subtitle}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        width: "7.5rem",
        sortable: true,
        sortValue: (brief) => GEO_WRITE_BRIEF_STATUS_LABELS[brief.status],
        cell: (brief) => <BriefStatusBadge status={brief.status} />,
      },
      {
        key: "createdAt",
        header: "Created",
        width: "8rem",
        sortable: true,
        sortValue: (brief) => brief.createdAt,
        cell: (brief) => (
          <span className="text-muted-foreground whitespace-nowrap tabular-nums">
            {formatRelativeDate(brief.createdAt)}
          </span>
        ),
      },
    ],
    []
  );

  if (briefs.length === 0) {
    return null;
  }

  return (
    <div className="min-h-0 w-full" ref={tableRef}>
      <Table
        className="rounded-2xl"
        columns={columns}
        data={briefs}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        getRowId={(brief) => brief.id}
        height={tableBodyHeight}
        loading={loading}
        onRowClick={(brief) => onOpen(brief.id)}
        onRowPointerEnter={(brief) => onHover?.(brief.id)}
        rowHeight={GEO_WRITE_TABLE_ROW_HEIGHT}
        selectedRowIds={activeBriefId ? [activeBriefId] : undefined}
      />
    </div>
  );
}
