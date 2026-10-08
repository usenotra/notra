import { HugeiconsIcon } from "@hugeicons/react";
import { DataTable } from "@notra/ui/components/ui/data-table";
import type { TableColumn } from "@notra/ui/components/ui/data-table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";

import { EngineIcon } from "@/components/geo/engine-icon";
import {
  AGENT_FEEDBACK_LABEL_PILL_CLASS,
  AGENT_FEEDBACK_SENTIMENT_ICON_CLASS,
  AGENT_FEEDBACK_SENTIMENT_ICONS,
  AGENT_FEEDBACK_SENTIMENT_PILL_CLASS,
} from "@/constants/agent-feedback";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import { cn } from "@/lib/utils";
import type {
  SentimentDetailRow,
  SentimentThemeTableProps,
} from "@/types/geo-sentiment";
import { formatModelLabel } from "@/utils/geo-model-display";
import { sentimentTableRows } from "@/utils/sentiment-table";

function SentimentPolarityIcon({
  polarity,
}: {
  polarity: SentimentDetailRow["polarity"];
}) {
  const tLabels = useTranslations("common.labels");
  return (
    <span
      className={`${AGENT_FEEDBACK_SENTIMENT_ICON_CLASS[polarity]} flex h-5 items-center`}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-4 shrink-0"
        icon={AGENT_FEEDBACK_SENTIMENT_ICONS[polarity]}
        strokeWidth={2}
      />
      <span className="sr-only">{tLabels(polarity)}</span>
    </span>
  );
}

function SentimentPolarityPill({
  polarity,
}: {
  polarity: SentimentDetailRow["polarity"];
}) {
  const tLabels = useTranslations("common.labels");
  return (
    <span
      className={`${AGENT_FEEDBACK_LABEL_PILL_CLASS} ${AGENT_FEEDBACK_SENTIMENT_PILL_CLASS[polarity]}`}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3.5 shrink-0"
        icon={AGENT_FEEDBACK_SENTIMENT_ICONS[polarity]}
        strokeWidth={2}
      />
      {tLabels(polarity)}
    </span>
  );
}

export function SentimentResultsTable({
  themes,
  pending,
}: SentimentThemeTableProps) {
  const t = useTranslations("geo.sentimentResultsTable");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const rows = useMemo(
    () => (pending ? [] : sentimentTableRows(themes)),
    [themes, pending]
  );
  const current = rows.find((row) => row.id === selectedId) ?? null;
  const [selected, releaseSelected] = useRetainedValue(current);
  const columns = useMemo<TableColumn<SentimentDetailRow>[]>(
    () => [
      {
        key: "polarity",
        header: isMobile ? (
          <span className="sr-only">{tCommon("labels.sentiment")}</span>
        ) : (
          tCommon("labels.sentiment")
        ),
        width: isMobile ? "2.5rem" : "9rem",
        sortable: !isMobile,
        cell: (row) =>
          isMobile ? (
            <SentimentPolarityIcon polarity={row.polarity} />
          ) : (
            <SentimentPolarityPill polarity={row.polarity} />
          ),
      },
      {
        key: "title",
        header: t("columns.claim"),
        width: "1fr",
        minWidth: "8rem",
        sortable: true,
        sortValue: (row) => row.theme,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={cn("font-medium", !isMobile && "truncate")}>
                {row.theme}
              </span>
              <span
                className={cn(
                  "text-muted-foreground text-xs",
                  isMobile ? "line-clamp-2" : "truncate"
                )}
              >
                {row.title}
              </span>
            </span>
          </span>
        ),
      },
      {
        key: "models",
        header: tCommon("labels.models"),
        width: "8rem",
        collapsePriority: 1,
        cell: (row) => (
          <span className="flex items-center gap-1.5">
            {[...new Set(row.evidence.map((evidence) => evidence.engine))]
              .slice(0, 3)
              .map((engine) => (
                <span key={engine} title={formatModelLabel(engine)}>
                  <EngineIcon engine={engine} />
                  <span className="sr-only">{formatModelLabel(engine)}</span>
                </span>
              ))}
            {new Set(row.evidence.map((evidence) => evidence.engine)).size >
            3 ? (
              <span className="text-muted-foreground text-xs">
                +
                {new Set(row.evidence.map((evidence) => evidence.engine)).size -
                  3}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "answers",
        header: t("columns.evidence"),
        width: isMobile ? "5rem" : "9rem",
        align: "right",
        sortable: true,
        sortValue: (row) =>
          new Set(row.evidence.map((evidence) => evidence.checkId)).size,
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {new Set(row.evidence.map((evidence) => evidence.checkId)).size}
          </span>
        ),
      },
    ],
    [isMobile, t]
  );

  return (
    <div
      id="sentiment-claims"
      className="sentiment-results-table min-w-0 scroll-mt-24 space-y-3"
      aria-hidden={pending}
      data-ready={!pending}
      inert={pending || undefined}
    >
      <DataTable
        columns={
          isMobile
            ? [...columns.slice(0, 2), ...columns.slice(3)]
            : [
                ...columns.slice(1, 2),
                ...columns.slice(0, 1),
                ...columns.slice(2),
              ]
        }
        data={rows}
        getRowId={(row) => row.id}
        rowHeight={TABLE_ROW_HEIGHT}
        rowSizing={isMobile ? "content" : "fixed"}
        autoHeight={isMobile}
        scrollFade={!isMobile}
        height={
          (Math.min(Math.max(rows.length, pending ? 3 : 1), 8) + 1) *
          TABLE_ROW_HEIGHT
        }
        loading={pending}
        resizable={!isMobile}
        minColumnWidth={isMobile ? 40 : undefined}
        skeletonRows={3}
        emptyState={t("empty")}
        onRowClick={(row) => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          setSelectedId(row.id);
        }}
      />
      <Sheet
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onOpenChangeComplete={releaseSelected}
      >
        <SheetContent
          finalFocus={returnFocus}
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="border-b p-5 pr-12">
            <SheetTitle className="wrap-anywhere">{selected?.theme}</SheetTitle>
            <SheetDescription className="wrap-anywhere">
              {selected?.title}
            </SheetDescription>
          </SheetHeader>
          <ul className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
            {selected?.evidence.map((evidence) => (
              <li
                key={`${evidence.checkId}-${evidence.quote}`}
                className="space-y-3"
              >
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <EngineIcon engine={evidence.engine} />
                  <span className="min-w-0 break-words">
                    {formatModelLabel(evidence.engine)}
                  </span>
                  <time
                    className="ml-auto shrink-0 tabular-nums"
                    dateTime={evidence.capturedAt}
                  >
                    {t("capturedAt", {
                      date: evidence.capturedAt.slice(0, 10),
                    })}
                  </time>
                </div>
                <p className="text-sm [overflow-wrap:anywhere]">
                  {evidence.prompt}
                </p>
                <blockquote className="border-primary/30 border-l-2 pl-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                  {evidence.quote}
                </blockquote>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
