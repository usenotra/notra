"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { PurposeBadge } from "@notra/ui/components/geo/purpose-badge";
import { ScrollArea, ScrollBar } from "@notra/ui/components/ui/scroll-area";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";

import { formatCapturedAt } from "@/lib/landing/live-traffic";
import type { CitationRowsProps, LiveCitationRow } from "@/types/landing/geo";

const HEADER_CLASS = "h-11 text-muted-foreground text-sm";
const TABLE_CLASS =
  "w-full table-fixed caption-bottom border-separate border-spacing-0 text-sm";
const DUAL_TONE_HEADER =
  "border-border bg-muted overflow-hidden rounded-t-2xl border border-b-0 pb-5";
const DUAL_TONE_BODY =
  "border-border bg-background relative z-10 -mt-5 min-h-0 flex-1 overflow-hidden rounded-2xl border";
const ROW_ENTER_CLASS =
  "animate-in fade-in slide-in-from-top-2 fill-mode-both duration-normal ease-emphasized motion-reduce:animate-none";

function MarkdownFlag() {
  return (
    <span className="border-border text-muted-foreground inline-flex h-4.5 shrink-0 items-center rounded border px-1 font-mono text-[0.6875rem] leading-none">
      MD
    </span>
  );
}

function CitationPath({ row }: { row: LiveCitationRow }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="text-muted-foreground min-w-0 truncate font-mono text-[0.8125rem]">
        {row.path}
      </span>
      {row.markdown ? <MarkdownFlag /> : null}
    </span>
  );
}

function CitationColGroup() {
  return (
    <colgroup>
      <col className="hidden lg:table-column lg:w-[11.5rem]" />
      <col />
      <col className="hidden lg:table-column" />
      <col className="w-[9.75rem] lg:w-[11.5rem]" />
    </colgroup>
  );
}

function CitationCells({
  row,
  base,
}: {
  row: LiveCitationRow;
  base: number | null;
}) {
  return (
    <>
      <TableCell className="text-muted-foreground hidden py-3.5 text-sm whitespace-nowrap tabular-nums lg:table-cell">
        {base === null ? (
          <span aria-hidden>{"\u00a0"}</span>
        ) : (
          formatCapturedAt(row, base)
        )}
      </TableCell>
      <TableCell className="min-w-0 py-3.5">
        <span className="flex items-center gap-2.5 text-[0.9375rem] font-medium whitespace-nowrap">
          <EngineIcon className="size-4.5 shrink-0" engine={row.engine} />
          <span className="truncate">{row.provider}</span>
        </span>
      </TableCell>
      <TableCell className="hidden py-3.5 lg:table-cell">
        <CitationPath row={row} />
      </TableCell>
      <TableCell className="w-[1%] py-3.5 whitespace-nowrap">
        <PurposeBadge category={row.purpose} />
      </TableCell>
    </>
  );
}

export function CitationRows({
  rows,
  base,
  animated,
  enteringId,
  onEntered,
  headers,
}: CitationRowsProps) {
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      role="region"
      aria-label="Recent AI crawlers"
    >
      <div className={DUAL_TONE_HEADER}>
        <table className={TABLE_CLASS}>
          <CitationColGroup />
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead
                className={cn(
                  HEADER_CLASS,
                  "hidden lg:table-cell lg:w-[11.5rem]"
                )}
              >
                {headers.when}
              </TableHead>
              <TableHead className={HEADER_CLASS}>{headers.provider}</TableHead>
              <TableHead className={cn(HEADER_CLASS, "hidden lg:table-cell")}>
                {headers.path}
              </TableHead>
              <TableHead className={cn(HEADER_CLASS, "lg:w-[11.5rem]")}>
                {headers.purpose}
              </TableHead>
            </TableRow>
          </TableHeader>
        </table>
      </div>
      <div className={DUAL_TONE_BODY}>
        <ScrollArea className="h-full">
          <table className={TABLE_CLASS}>
            <CitationColGroup />
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  className={cn(
                    "[&>td]:border-border [&>td]:border-b",
                    animated && row.id === enteringId ? ROW_ENTER_CLASS : null
                  )}
                  key={row.id}
                  onAnimationEnd={
                    animated && row.id === enteringId
                      ? (event) => {
                          if (event.target === event.currentTarget) {
                            onEntered?.(row.id);
                          }
                        }
                      : undefined
                  }
                >
                  <CitationCells base={base} row={row} />
                </TableRow>
              ))}
            </TableBody>
          </table>
          <ScrollBar className="max-lg:hidden" orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
