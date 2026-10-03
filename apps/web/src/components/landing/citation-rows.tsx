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

import {
  DUAL_TONE_TABLE_BODY,
  DUAL_TONE_TABLE_CLASS,
  DUAL_TONE_TABLE_HEADER,
  DUAL_TONE_TABLE_HEADER_CELL_CLASS,
  DUAL_TONE_TABLE_ROOT,
} from "@/constants/landing/dual-tone-table";
import { formatCapturedAt } from "@/lib/landing/live-traffic";
import type { CitationRowsProps, LiveCitationRow } from "@/types/landing/geo";

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
      <col className="hidden w-[9.75rem] sm:table-column lg:w-[11.5rem]" />
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
        <span className="mt-1 flex flex-col items-start gap-2 pl-7 lg:hidden">
          <CitationPath row={row} />
          <span className="sm:hidden">
            <PurposeBadge category={row.purpose} />
          </span>
        </span>
      </TableCell>
      <TableCell className="hidden py-3.5 lg:table-cell">
        <CitationPath row={row} />
      </TableCell>
      <TableCell className="hidden w-[1%] py-3.5 whitespace-nowrap sm:table-cell">
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
      className={DUAL_TONE_TABLE_ROOT}
      role="region"
      aria-label="Recent AI crawlers"
    >
      <div className={DUAL_TONE_TABLE_HEADER}>
        <table className={DUAL_TONE_TABLE_CLASS}>
          <CitationColGroup />
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead
                className={cn(
                  DUAL_TONE_TABLE_HEADER_CELL_CLASS,
                  "hidden lg:table-cell lg:w-[11.5rem]"
                )}
              >
                {headers.when}
              </TableHead>
              <TableHead className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}>
                {headers.provider}
              </TableHead>
              <TableHead
                className={cn(
                  DUAL_TONE_TABLE_HEADER_CELL_CLASS,
                  "hidden lg:table-cell"
                )}
              >
                {headers.path}
              </TableHead>
              <TableHead
                className={cn(
                  DUAL_TONE_TABLE_HEADER_CELL_CLASS,
                  "hidden sm:table-cell lg:w-[11.5rem]"
                )}
              >
                {headers.purpose}
              </TableHead>
            </TableRow>
          </TableHeader>
        </table>
      </div>
      <div className={DUAL_TONE_TABLE_BODY}>
        <ScrollArea className="h-full">
          <table className={DUAL_TONE_TABLE_CLASS}>
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
