import { ACCURACY_CATEGORY_LABELS } from "@notra/geo-core/constants/accuracy-analysis";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@notra/ui/components/ui/sheet";
import { useIsMobile } from "@notra/ui/hooks/use-mobile";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/button";
import { EngineIcon } from "@/components/geo/engine-icon";
import { Table } from "@/components/motion/table";
import type { TableColumn } from "@/components/motion/table/types";
import {
  ACCURACY_VERDICT_LABELS,
  ACCURACY_VERDICT_STYLES,
} from "@/constants/geo-accuracy";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import { useRetainedValue } from "@/lib/hooks/use-retained-value";
import type {
  AccuracyClaimRow,
  AccuracyClaimsTableProps,
} from "@/types/geo-accuracy";
import { accuracyClaimRows, publicHttpUrl } from "@/utils/geo-accuracy";
import { formatModelLabel } from "@/utils/geo-model-display";

function uniqueEngines(row: AccuracyClaimRow): string[] {
  return [...new Set(row.evidence.map((evidence) => evidence.engine))];
}

export function AccuracyClaimsTable({
  claims,
  facts,
  pending,
  knowledgeHref,
  writerHref,
}: AccuracyClaimsTableProps) {
  const isMobile = useIsMobile();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const rows = useMemo(
    () => (pending ? [] : accuracyClaimRows(claims, facts)),
    [claims, facts, pending]
  );
  const current = rows.find((row) => row.id === selectedId) ?? null;
  const [selected, releaseSelected] = useRetainedValue(current);
  const columns = useMemo<TableColumn<AccuracyClaimRow>[]>(
    () => [
      {
        key: "verdict",
        header: "Verdict",
        width: "9rem",
        sortable: true,
        cell: (row) => (
          <span
            className={`inline-flex items-center gap-2 text-xs ${ACCURACY_VERDICT_STYLES[row.verdict].text}`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${ACCURACY_VERDICT_STYLES[row.verdict].fill}`}
            />
            {ACCURACY_VERDICT_LABELS[row.verdict]}
          </span>
        ),
      },
      {
        key: "statement",
        header: "Claim",
        width: "1fr",
        minWidth: isMobile ? "8rem" : "15rem",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 flex-col gap-0.5 text-sm">
            <span className="truncate font-medium">{row.statement}</span>
            <span className="text-muted-foreground truncate text-xs">
              {ACCURACY_CATEGORY_LABELS[row.category]}
            </span>
            {isMobile ? (
              <span
                className={`text-[0.6875rem] ${ACCURACY_VERDICT_STYLES[row.verdict].text}`}
              >
                {ACCURACY_VERDICT_LABELS[row.verdict]}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        key: "models",
        header: "Models",
        width: "8rem",
        cell: (row) => {
          const engines = uniqueEngines(row);
          return (
            <span className="flex items-center gap-1.5">
              {engines.slice(0, 3).map((engine) => (
                <span
                  key={engine}
                  title={formatModelLabel(engine)}
                  className="border-border bg-background flex size-6 items-center justify-center rounded-md border"
                >
                  <EngineIcon engine={engine} />
                  <span className="sr-only">{formatModelLabel(engine)}</span>
                </span>
              ))}
              {engines.length > 3 ? (
                <span className="text-muted-foreground text-xs">
                  +{engines.length - 3}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        key: "answers",
        header: "Evidence",
        width: "6rem",
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
    [isMobile]
  );

  return (
    <div
      aria-busy={pending}
      className="min-w-0 scroll-mt-24 space-y-3"
      id="accuracy-claims"
    >
      <Table
        className="[&_tr:focus-visible]:outline-ring rounded-2xl [&_tr:focus-visible]:outline-2 [&_tr:focus-visible]:-outline-offset-2"
        columns={
          isMobile
            ? columns.filter(
                (column) => column.key !== "verdict" && column.key !== "models"
              )
            : [
                ...columns.slice(1, 2),
                ...columns.slice(0, 1),
                ...columns.slice(2),
              ]
        }
        data={rows}
        emptyState="No checkable claims in this sample."
        getRowId={(row) => row.id}
        height={
          (Math.min(Math.max(rows.length, pending ? 3 : 1), 8) + 1) *
          TABLE_ROW_HEIGHT
        }
        loading={pending}
        onRowClick={(row) => {
          returnFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          setSelectedId(row.id);
        }}
        resizable
        rowHeight={TABLE_ROW_HEIGHT}
        skeletonRows={3}
      />
      <Sheet
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
        onOpenChangeComplete={releaseSelected}
        open={current !== null}
      >
        <SheetContent
          className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
          finalFocus={returnFocus}
        >
          <SheetHeader className="border-b p-5 pr-12">
            <SheetTitle>{selected?.statement}</SheetTitle>
            <SheetDescription>
              {selected
                ? `${ACCURACY_VERDICT_LABELS[selected.verdict]} · ${ACCURACY_CATEGORY_LABELS[selected.category]}`
                : "Claim detail"}
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-8 overflow-y-auto p-5">
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Knowledge</h3>
              {selected?.relatedFacts.length ? (
                <ul className="space-y-3">
                  {selected.relatedFacts.map((fact) => {
                    const href = publicHttpUrl(fact.sourceUrl);
                    return (
                      <li key={fact.id} className="space-y-1">
                        <p className="text-sm [overflow-wrap:anywhere]">
                          {fact.statement}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {ACCURACY_CATEGORY_LABELS[fact.category]}
                          {href ? (
                            <>
                              {" · "}
                              <a
                                className="text-foreground underline-offset-2 hover:underline"
                                href={href}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                Source
                              </a>
                            </>
                          ) : null}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No close match on the Knowledge list. Jev still ranked this
                  claim against every stored fact.
                </p>
              )}
              <Button
                render={<a href={knowledgeHref} />}
                size="sm"
                variant="outline"
              >
                Open Knowledge
              </Button>
            </section>
            <section className="space-y-4">
              <h3 className="text-sm font-medium">AI answers</h3>
              <ul className="space-y-6">
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
                        {evidence.capturedAt.slice(0, 10)} UTC
                      </time>
                    </div>
                    <p className="text-sm [overflow-wrap:anywhere]">
                      {evidence.prompt}
                    </p>
                    <blockquote className="border-primary/30 border-l-2 pl-3 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">
                      {evidence.quote}
                    </blockquote>
                    {evidence.sources.length ? (
                      <ul className="space-y-1 text-xs">
                        {evidence.sources.map((source) => {
                          const href = publicHttpUrl(source.url);
                          if (!href) {
                            return null;
                          }
                          return (
                            <li key={href}>
                              <a
                                className="text-foreground underline-offset-2 hover:underline"
                                href={href}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                {source.title || href}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
            {selected?.verdict === "inaccurate" ? (
              <Button render={<a href={writerHref} />} size="sm">
                Write a correction
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
