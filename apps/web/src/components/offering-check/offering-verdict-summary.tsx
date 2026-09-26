import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { Skeleton } from "@notra/ui/components/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";

import {
  OFFERING_MODE_TITLES,
  OFFERING_VERDICT_COPY,
} from "@/constants/offering-check";
import type {
  OfferingCheckMode,
  OfferingCheckResult,
  OfferingVerdictSummaryProps,
} from "@/types/offering-check";

const MODES: readonly OfferingCheckMode[] = ["memory", "search"];

const HEADER_CLASS = "h-11 text-muted-foreground text-sm";
const TABLE_CLASS =
  "w-full table-fixed caption-bottom border-separate border-spacing-0 text-sm";
const DUAL_TONE_HEADER =
  "border-border bg-muted overflow-hidden rounded-t-2xl border border-b-0 pb-5";
const DUAL_TONE_BODY =
  "border-border bg-background relative z-10 -mt-5 overflow-hidden rounded-2xl border";
const ROW_CLASS =
  "[&>td]:border-border [&>td]:border-b last:[&>td]:border-b-0 hover:bg-transparent";

function VerdictColGroup() {
  return (
    <colgroup>
      <col className="md:w-[13rem]" />
      <col className="w-[7.5rem] md:w-[10rem]" />
      <col className="hidden md:table-column" />
      <col className="hidden md:table-column md:w-[8rem]" />
    </colgroup>
  );
}

function pagesRead(result: OfferingCheckResult, mode: OfferingCheckMode) {
  if (mode === "memory") {
    return "None";
  }
  const pages = result.sources.reduce(
    (total, source) => total + source.pages,
    0
  );
  return pages === 1 ? "1 page" : `${pages} pages`;
}

export function OfferingVerdictSummary({
  result,
}: OfferingVerdictSummaryProps) {
  return (
    <div className="text-foreground flex flex-col [--muted-foreground:#595959] dark:[--muted-foreground:#b8b8be]">
      <div className={DUAL_TONE_HEADER}>
        <table className={TABLE_CLASS}>
          <VerdictColGroup />
          <TableHeader className="bg-muted">
            <TableRow className="hover:bg-transparent">
              <TableHead className={HEADER_CLASS}>Asked</TableHead>
              <TableHead className={HEADER_CLASS}>Verdict</TableHead>
              <TableHead className={cn(HEADER_CLASS, "hidden md:table-cell")}>
                What it said
              </TableHead>
              <TableHead className={cn(HEADER_CLASS, "hidden md:table-cell")}>
                Pages read
              </TableHead>
            </TableRow>
          </TableHeader>
        </table>
      </div>
      <div className={DUAL_TONE_BODY}>
        <table className={TABLE_CLASS}>
          <caption className="sr-only">
            What the model knew from memory and with web search
          </caption>
          <VerdictColGroup />
          <TableBody>
            {MODES.map((mode) => {
              const verdict = result
                ? OFFERING_VERDICT_COPY[result[mode].verdict]
                : null;
              return (
                <TableRow className={ROW_CLASS} key={mode}>
                  <TableCell className="py-3.5 align-top">
                    <span className="flex items-center gap-2.5 text-[0.9375rem] font-medium whitespace-nowrap">
                      <EngineIcon
                        className="block size-4.5 shrink-0"
                        engine="openai"
                      />
                      {OFFERING_MODE_TITLES[mode]}
                    </span>
                    {result ? (
                      <p className="text-muted-foreground pt-1.5 text-sm/5.5 whitespace-normal md:hidden">
                        {result[mode].summary}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-3.5 align-top">
                    {verdict ? (
                      <span
                        className={cn(
                          "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium whitespace-nowrap",
                          verdict.className
                        )}
                      >
                        {verdict.label}
                      </span>
                    ) : (
                      <Skeleton className="h-6 w-20" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden py-3.5 align-top text-[0.9375rem]/6 whitespace-normal md:table-cell">
                    {result ? (
                      result[mode].summary
                    ) : (
                      <Skeleton className="h-5 w-10/12" />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden py-3.5 align-top whitespace-nowrap tabular-nums md:table-cell">
                    {result ? (
                      pagesRead(result, mode)
                    ) : (
                      <Skeleton className="h-5 w-14" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
