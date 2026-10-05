"use client";

import type { GeoContentBriefStatus } from "@notra/db/types/geo-writer";
import {
  GEO_WRITE_TABLE_HEIGHT,
  GEO_WRITE_TABLE_MIN_ROWS,
  GEO_WRITE_TABLE_ROW_HEIGHT,
} from "@notra/geo-core/constants/geo";
import type { GeoContentBriefSummary } from "@notra/geo-core/types/geo";
import { Badge } from "@notra/ui/components/ui/badge";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { Spinner } from "@notra/ui/components/ui/spinner";
import { TABLE_FRAME_INSET_PX } from "@notra/ui/constants/table";
import { formatDistanceToNowStrict } from "date-fns";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { useBriefStatusLabels } from "@/lib/hooks/use-brief-status-labels";
import { useDateFnsLocale } from "@/lib/i18n/date-fns";
import type { BriefHistoryProps } from "@/types/components/geo-writer";
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
  const statusLabels = useBriefStatusLabels();
  return (
    <Badge
      className="inline-flex items-center gap-1.5 rounded-sm text-[0.6875rem] whitespace-nowrap"
      variant={statusVariant(status)}
    >
      {status === "writing" ? <Spinner className="size-3.5" /> : null}
      {statusLabels[status]}
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

  // The table frame adds its rim and borders on top of the passed height.
  return (
    page.getBoundingClientRect().bottom -
    inset -
    elementTop -
    TABLE_FRAME_INSET_PX
  );
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
  const t = useTranslations("geo.writer.briefHistory");
  const tCommon = useTranslations("common");
  const statusLabels = useBriefStatusLabels();
  const dateLocale = useDateFnsLocale();
  const [tableRef, tableHeight] = useFillHeight(GEO_WRITE_TABLE_HEIGHT);
  const tableBodyHeight = Math.min(
    tableHeight,
    // One extra row for the header, which `height` includes.
    (Math.max(briefs.length, GEO_WRITE_TABLE_MIN_ROWS) + 1) *
      GEO_WRITE_TABLE_ROW_HEIGHT
  );

  const columns = useMemo<TableColumn<GeoContentBriefSummary>[]>(
    () => [
      {
        key: "article",
        header: t("article"),
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
        header: tCommon("labels.status"),
        width: "7.5rem",
        sortable: true,
        sortValue: (brief) => statusLabels[brief.status],
        cell: (brief) => <BriefStatusBadge status={brief.status} />,
      },
      {
        key: "createdAt",
        header: tCommon("labels.created"),
        width: "8rem",
        sortable: true,
        sortValue: (brief) => brief.createdAt,
        cell: (brief) => (
          <span className="text-muted-foreground whitespace-nowrap tabular-nums">
            {formatDistanceToNowStrict(new Date(brief.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        ),
      },
    ],
    [dateLocale, t]
  );

  if (briefs.length === 0) {
    return null;
  }

  return (
    <div className="min-h-0 w-full" ref={tableRef}>
      <DataTable
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
