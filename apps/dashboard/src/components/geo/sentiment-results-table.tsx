import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo, useRef, useState } from "react";

import { EngineIcon } from "@/components/geo/engine-icon";
import { Table } from "@/components/motion/table";
import type { TableColumn } from "@/components/motion/table/types";
import { SENTIMENT_POLARITY_STYLES } from "@/constants/geo-sentiment";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type {
  SentimentDetailRow,
  SentimentTableView,
  SentimentThemeTableProps,
} from "@/types/geo-sentiment";
import { sentimentTableRows } from "@/utils/sentiment-table";

export function SentimentResultsTable({
  themes,
  pending,
}: SentimentThemeTableProps) {
  const [view, setView] = useState<SentimentTableView>("themes");
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const rows = useMemo(
    () => (pending ? [] : sentimentTableRows(themes, view)),
    [themes, view, pending]
  );
  const selected = rows.find((row) => row.id === selectedId);
  const columns = useMemo<TableColumn<SentimentDetailRow>[]>(
    () => [
      {
        key: "polarity",
        header: "Sentiment",
        width: "8rem",
        sortable: true,
        cell: (row) => (
          <span
            className={`inline-flex items-center gap-2 text-xs capitalize ${SENTIMENT_POLARITY_STYLES[row.polarity].text}`}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-current"
            />
            {row.polarity}
          </span>
        ),
      },
      {
        key: "title",
        header: view === "themes" ? "Theme" : "Prompt",
        width: "1fr",
        minWidth: isMobile ? "8rem" : "15rem",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <HugeiconsIcon
              aria-hidden="true"
              icon={ArrowRight01Icon}
              size={14}
              className="text-muted-foreground shrink-0"
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">{row.title}</span>
              {isMobile ? (
                <span
                  className={`text-[0.6875rem] capitalize ${SENTIMENT_POLARITY_STYLES[row.polarity].text}`}
                >
                  {row.polarity}
                </span>
              ) : null}
            </span>
          </span>
        ),
      },
      {
        key: "models",
        header: "Models",
        width: "8rem",
        cell: (row) => (
          <span className="flex items-center gap-1.5">
            {[...new Set(row.evidence.map((evidence) => evidence.engine))]
              .slice(0, 3)
              .map((engine) => (
                <span
                  key={engine}
                  title={engine}
                  className="border-border bg-background flex size-6 items-center justify-center rounded-md border"
                >
                  <EngineIcon engine={engine} />
                  <span className="sr-only">{engine}</span>
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
        key: view === "themes" ? "answers" : "capturedAt",
        header: view === "themes" ? "Answers" : "Checked",
        width: view === "themes" ? "6rem" : "8.5rem",
        align: "right",
        sortable: true,
        sortValue: (row) =>
          view === "themes"
            ? new Set(row.evidence.map((evidence) => evidence.checkId)).size
            : (row.evidence[0]?.capturedAt ?? ""),
        cell: (row) => (
          <span className="text-muted-foreground tabular-nums">
            {view === "themes"
              ? new Set(row.evidence.map((evidence) => evidence.checkId)).size
              : formatAiTrafficTimestamp(row.evidence[0]?.capturedAt ?? "")}
          </span>
        ),
      },
    ],
    [view, isMobile]
  );

  return (
    <div className="min-w-0 space-y-3" aria-busy={pending}>
      <Tabs
        className="min-w-0 gap-3"
        value={view}
        onValueChange={(value) => {
          if (value === "themes" || value === "answers") {
            setView(value);
            setSelectedId(null);
          }
        }}
      >
        <TabsList aria-label="Sentiment evidence view">
          <TabsTrigger value="themes">By theme</TabsTrigger>
          <TabsTrigger value="answers">Supporting answers</TabsTrigger>
        </TabsList>
        <TabsContent value={view} className="min-w-0">
          <Table
            columns={
              isMobile
                ? columns.filter(
                    (column) =>
                      column.key !== "polarity" && column.key !== "models"
                  )
                : columns
            }
            data={rows}
            getRowId={(row) => row.id}
            rowHeight={TABLE_ROW_HEIGHT}
            height={
              (Math.min(Math.max(rows.length, 3), 8) + 1) * TABLE_ROW_HEIGHT
            }
            loading={pending}
            skeletonRows={3}
            emptyState="No supporting answers in this sample."
            onRowClick={(row) => {
              returnFocus.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
              setSelectedId(row.id);
            }}
            className="[&_tr:focus-visible]:outline-ring rounded-2xl [&_tr:focus-visible]:outline-2 [&_tr:focus-visible]:-outline-offset-2"
          />
        </TabsContent>
      </Tabs>
      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      >
        <SheetContent
          finalFocus={returnFocus}
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
        >
          <SheetHeader className="border-b p-5 pr-12">
            <SheetTitle>{selected?.title}</SheetTitle>
            <SheetDescription>
              Exact quotes from the analyzed sample of saved answers.
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
                  <span className="min-w-0 break-words">{evidence.engine}</span>
                  <time
                    className="ml-auto shrink-0 tabular-nums"
                    dateTime={evidence.capturedAt}
                  >
                    {evidence.capturedAt.slice(0, 10)} UTC
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
