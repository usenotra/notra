"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { PurposeBadge } from "@notra/ui/components/geo/purpose-badge";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";
import { AnimatePresence, domAnimation, LazyMotion, m } from "motion/react";

import { formatCapturedAt } from "@/lib/landing/live-traffic";
import type { CitationRowsProps, LiveCitationRow } from "@/types/landing/geo";

const HEADER_CLASS = "h-11 text-muted-foreground text-sm";

const ROW_ENTER = { opacity: 0, y: -12 } as const;
const ROW_VISIBLE = { opacity: 1, y: 0 } as const;
const ROW_EXIT = { opacity: 0 } as const;
const ROW_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] } as const;

function CitationCells({
  row,
  base,
}: {
  row: LiveCitationRow;
  base: number | null;
}) {
  return (
    <>
      <TableCell className="text-muted-foreground py-3.5 text-sm whitespace-nowrap tabular-nums">
        {base === null ? (
          <Skeleton aria-hidden className="h-4 w-32" />
        ) : (
          <m.span
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {formatCapturedAt(row, base)}
          </m.span>
        )}
      </TableCell>
      <TableCell className="py-3.5">
        <span className="flex items-center gap-2.5 text-[0.9375rem] font-medium whitespace-nowrap">
          <EngineIcon className="size-4.5" engine={row.engine} />
          {row.provider}
        </span>
      </TableCell>
      <TableCell className="py-3.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground min-w-0 truncate font-mono text-[0.8125rem]">
            {row.path}
          </span>
          {row.markdown ? (
            <span className="border-border text-muted-foreground inline-flex h-4.5 shrink-0 items-center rounded border px-1 font-mono text-[0.6875rem] leading-none">
              MD
            </span>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="py-3.5">
        <PurposeBadge category={row.purpose} />
      </TableCell>
    </>
  );
}

export function CitationRows({
  rows,
  base,
  animated,
  headers,
}: CitationRowsProps) {
  return (
    <Table className="min-w-[52rem] table-fixed">
      <TableHeader className="bg-muted sticky top-0 z-10">
        <TableRow>
          <TableHead className={cn(HEADER_CLASS, "w-[11.5rem]")}>
            {headers.when}
          </TableHead>
          <TableHead className={cn(HEADER_CLASS, "w-[14rem]")}>
            {headers.provider}
          </TableHead>
          <TableHead className={HEADER_CLASS}>{headers.path}</TableHead>
          <TableHead className={cn(HEADER_CLASS, "w-[11.5rem]")}>
            {headers.purpose}
          </TableHead>
        </TableRow>
      </TableHeader>
      <LazyMotion features={domAnimation}>
        <TableBody>
          <AnimatePresence initial={false}>
            {rows.map((row) =>
              animated ? (
                <m.tr
                  animate={ROW_VISIBLE}
                  className="[&>td]:border-border [&>td]:border-b"
                  exit={ROW_EXIT}
                  initial={ROW_ENTER}
                  key={row.id}
                  layout="position"
                  transition={ROW_TRANSITION}
                >
                  <CitationCells base={base} row={row} />
                </m.tr>
              ) : (
                <TableRow key={row.id}>
                  <CitationCells base={base} row={row} />
                </TableRow>
              )
            )}
          </AnimatePresence>
        </TableBody>
      </LazyMotion>
    </Table>
  );
}
