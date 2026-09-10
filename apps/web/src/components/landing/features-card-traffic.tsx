import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { PurposeBadge } from "@notra/ui/components/geo/purpose-badge";
import { StatTiles } from "@notra/ui/components/geo/stat-tiles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { cn } from "@notra/ui/lib/utils";

import { MockFrame } from "@/components/landing/mock-frame";
import {
  FEATURES_TABLE_OPTIONAL_COL,
  FEATURES_TRAFFIC_FRAME,
  FEATURES_TRAFFIC_HEADERS,
  FEATURES_TRAFFIC_KPIS,
  FEATURES_TRAFFIC_ROWS,
} from "@/constants/landing/features";

const HEADER_CLASS = "text-muted-foreground text-xs";

export function FeaturesCardTraffic() {
  return (
    <MockFrame
      heading={FEATURES_TRAFFIC_FRAME.heading}
      subhead={FEATURES_TRAFFIC_FRAME.subhead}
    >
      <StatTiles
        className="border-border border-b"
        tiles={FEATURES_TRAFFIC_KPIS.map((kpi) => ({
          key: kpi.id,
          label: kpi.label,
          value: kpi.value,
        }))}
      />
      <Table className="table-fixed">
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className={HEADER_CLASS}>
              {FEATURES_TRAFFIC_HEADERS.source}
            </TableHead>
            <TableHead className={cn(HEADER_CLASS, "w-[9.75rem] sm:w-auto")}>
              {FEATURES_TRAFFIC_HEADERS.purpose}
            </TableHead>
            <TableHead
              className={cn(HEADER_CLASS, FEATURES_TABLE_OPTIONAL_COL)}
            >
              {FEATURES_TRAFFIC_HEADERS.visits}
            </TableHead>
            <TableHead
              className={cn(HEADER_CLASS, FEATURES_TABLE_OPTIONAL_COL)}
            >
              {FEATURES_TRAFFIC_HEADERS.lastSeen}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FEATURES_TRAFFIC_ROWS.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="min-w-0 py-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <EngineIcon className="shrink-0" engine={row.engine} />
                  <span className="truncate">{row.source}</span>
                </span>
              </TableCell>
              <TableCell className="w-[9.75rem] py-3 whitespace-nowrap sm:w-auto">
                <PurposeBadge category={row.purpose} />
              </TableCell>
              <TableCell
                className={cn(
                  "py-3 text-sm tabular-nums",
                  FEATURES_TABLE_OPTIONAL_COL
                )}
              >
                {row.visits.toLocaleString()}
              </TableCell>
              <TableCell
                className={cn(
                  "text-muted-foreground py-3 text-sm whitespace-nowrap",
                  FEATURES_TABLE_OPTIONAL_COL
                )}
              >
                {row.lastSeen}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MockFrame>
  );
}
