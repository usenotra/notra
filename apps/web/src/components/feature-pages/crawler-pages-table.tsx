import { cn } from "@notra/ui/lib/utils";

import { EngineIcon } from "@/components/feature-pages/engine-icon";
import { TableCard } from "@/components/feature-pages/table-card";
import { TableCell, TableHead, TableRow } from "@/components/marketing-table";
import {
  AI_CRAWLER_PAGE_COLUMNS,
  AI_CRAWLER_PAGE_ROWS,
} from "@/constants/feature-pages/ai-crawler-logs";
import {
  FEATURE_TABLE_EMPTY_CELL,
  FEATURE_TABLE_ROW_CLASS,
} from "@/constants/feature-pages/tables";
import { DUAL_TONE_TABLE_HEADER_CELL_CLASS } from "@/constants/landing/dual-tone-table";

export function CrawlerPagesTable() {
  return (
    <TableCard
      columns={
        <colgroup>
          <col className="w-[38%]" />
          {AI_CRAWLER_PAGE_COLUMNS.map(({ engine }) => (
            <col key={engine} />
          ))}
          <col className="w-[18%]" />
        </colgroup>
      }
      head={
        <>
          <TableHead className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}>
            Page
          </TableHead>
          {AI_CRAWLER_PAGE_COLUMNS.map(({ engine, label }) => (
            <TableHead
              className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}
              key={engine}
            >
              <span className="flex items-center gap-1.5">
                <EngineIcon adaptive className="size-3.5" engine={engine} />
                {label}
              </span>
            </TableHead>
          ))}
          <TableHead
            className={`${DUAL_TONE_TABLE_HEADER_CELL_CLASS} text-right`}
          >
            Last visit
          </TableHead>
        </>
      }
      meta="Last 30 days"
      minWidthClass="min-w-160"
      title="Pages AI engines read"
    >
      {AI_CRAWLER_PAGE_ROWS.map((row) => {
        const neverVisited = row.counts.every((count) => count === null);

        return (
          <TableRow className={FEATURE_TABLE_ROW_CLASS} key={row.path}>
            <TableCell className="text-muted-foreground truncate py-3.5 font-mono text-[0.8125rem]">
              {row.path}
            </TableCell>
            {row.counts.map((count, index) => (
              <TableCell
                className={cn(
                  "py-3.5 tabular-nums",
                  count === null && "text-muted-foreground"
                )}
                key={AI_CRAWLER_PAGE_COLUMNS[index]?.engine}
              >
                {count ?? FEATURE_TABLE_EMPTY_CELL}
              </TableCell>
            ))}
            <TableCell
              className={cn(
                "py-3.5 text-right font-medium",
                neverVisited && "text-[#A8601A] dark:text-[#E3A15A]"
              )}
            >
              {row.lastVisit}
            </TableCell>
          </TableRow>
        );
      })}
    </TableCard>
  );
}
