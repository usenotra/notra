import { TableCell, TableHead, TableRow } from "@notra/ui/components/ui/table";

import { RankBadge } from "@/components/feature-pages/rank-badge";
import { TableCard } from "@/components/feature-pages/table-card";
import { FEATURE_ENGINES } from "@/constants/feature-pages/engines";
import { PERSONAS_VISIBILITY_ROWS } from "@/constants/feature-pages/personas";
import { FEATURE_TABLE_ROW_CLASS } from "@/constants/feature-pages/tables";
import { DUAL_TONE_TABLE_HEADER_CELL_CLASS } from "@/constants/landing/dual-tone-table";

export function PersonasTable() {
  return (
    <TableCard
      columns={
        <colgroup>
          <col className="w-[34%]" />
          {FEATURE_ENGINES.map(({ engine }) => (
            <col key={engine} />
          ))}
          <col className="w-[13%]" />
        </colgroup>
      }
      head={
        <>
          <TableHead className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}>
            Persona
          </TableHead>
          {FEATURE_ENGINES.map(({ engine, label }) => (
            <TableHead
              className={DUAL_TONE_TABLE_HEADER_CELL_CLASS}
              key={engine}
            >
              {label}
            </TableHead>
          ))}
          <TableHead
            className={`${DUAL_TONE_TABLE_HEADER_CELL_CLASS} text-right`}
          >
            Visibility
          </TableHead>
        </>
      }
      meta="Last 30 days"
      minWidthClass="min-w-160"
      title="Persona visibility"
    >
      {PERSONAS_VISIBILITY_ROWS.map((row) => (
        <TableRow className={FEATURE_TABLE_ROW_CLASS} key={row.name}>
          <TableCell className="py-3">
            <div className="flex items-center gap-3">
              <img
                alt=""
                className="size-8 shrink-0 rounded-full"
                height={32}
                src={row.avatar}
                width={32}
              />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[0.9375rem] font-medium">
                  {row.name}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {row.role}
                </span>
              </div>
            </div>
          </TableCell>
          {FEATURE_ENGINES.map(({ engine }) => (
            <TableCell className="py-3" key={engine}>
              <RankBadge rank={row.ranks[engine]} />
            </TableCell>
          ))}
          <TableCell className="py-3 text-right font-semibold tabular-nums">
            {row.visibility}
          </TableCell>
        </TableRow>
      ))}
    </TableCard>
  );
}
