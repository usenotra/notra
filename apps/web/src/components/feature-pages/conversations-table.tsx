import { cn } from "@notra/ui/lib/utils";

import { EngineIcon } from "@/components/feature-pages/engine-icon";
import { RankBadge } from "@/components/feature-pages/rank-badge";
import { TableCard } from "@/components/feature-pages/table-card";
import { TableCell, TableHead, TableRow } from "@/components/marketing-table";
import {
  CONVERSATIONS_ENGINE_ROWS,
  CONVERSATIONS_THREAD_TITLE,
} from "@/constants/feature-pages/conversations";
import {
  FEATURE_TABLE_ROW_CLASS,
  FEATURE_TURN_LABELS,
} from "@/constants/feature-pages/tables";
import { DUAL_TONE_TABLE_HEADER_CELL_CLASS } from "@/constants/landing/dual-tone-table";

export function ConversationsTable() {
  return (
    <TableCard
      columns={
        <colgroup>
          <col className="w-[40%]" />
          {FEATURE_TURN_LABELS.map((label) => (
            <col key={label} />
          ))}
          <col className="w-[16%]" />
        </colgroup>
      }
      head={
        <>
          <TableHead className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}>
            Engine
          </TableHead>
          {FEATURE_TURN_LABELS.map((label) => (
            <TableHead
              className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}
              key={label}
            >
              {label}
            </TableHead>
          ))}
          <TableHead
            className={`${DUAL_TONE_TABLE_HEADER_CELL_CLASS} text-right`}
          >
            Mentioned
          </TableHead>
        </>
      }
      meta="Across engines"
      minWidthClass="min-w-140"
      title={CONVERSATIONS_THREAD_TITLE}
    >
      {CONVERSATIONS_ENGINE_ROWS.map((row) => (
        <TableRow className={FEATURE_TABLE_ROW_CLASS} key={row.engine}>
          <TableCell className="py-3.5">
            <span className="flex items-center gap-2.5 text-[0.9375rem] font-medium">
              <EngineIcon adaptive className="size-4.5" engine={row.engine} />
              {row.label}
            </span>
          </TableCell>
          {row.ranks.map((rank, index) => (
            <TableCell className="py-3.5" key={FEATURE_TURN_LABELS[index]}>
              <RankBadge rank={rank} />
            </TableCell>
          ))}
          <TableCell
            className={cn(
              "py-3.5 text-right font-medium tabular-nums",
              row.muted && "text-muted-foreground"
            )}
          >
            {row.mentioned}
          </TableCell>
        </TableRow>
      ))}
    </TableCard>
  );
}
