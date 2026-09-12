"use client";

import { EngineIcon } from "@notra/ui/components/geo/engine-icon";
import { GapMeter } from "@notra/ui/components/geo/gap-meter";
import { LogoStack } from "@notra/ui/components/geo/logo-stack";
import { Button } from "@notra/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@notra/ui/components/ui/table";
import { GEO_GAPS_METER_STEPS } from "@notra/ui/constants/geo";
import { cn } from "@notra/ui/lib/utils";

import { MockFrame } from "@/components/landing/mock-frame";
import {
  FEATURES_GAP_HEADERS,
  FEATURES_GAP_ROWS,
  FEATURES_GAPS_FRAME,
  FEATURES_TABLE_OPTIONAL_COL,
} from "@/constants/landing/features";
import { GEO_ENGINE_NAMES } from "@/constants/landing/geo-engines";

const HEADER_CLASS = "text-muted-foreground text-xs";
const OPPORTUNITY_COL = "w-[7.5rem]";
const MISSING_COL = "w-[7.5rem]";
const ACTION_COL = "w-[4.75rem]";

export function FeaturesCardGaps() {
  return (
    <MockFrame
      heading={FEATURES_GAPS_FRAME.heading}
      subhead={FEATURES_GAPS_FRAME.subhead}
    >
      <Table className="table-fixed">
        <TableHeader className="bg-muted/60">
          <TableRow>
            <TableHead className={HEADER_CLASS}>
              {FEATURES_GAP_HEADERS.content}
            </TableHead>
            <TableHead className={cn(HEADER_CLASS, OPPORTUNITY_COL)}>
              {FEATURES_GAP_HEADERS.opportunity}
            </TableHead>
            <TableHead
              className={cn(
                HEADER_CLASS,
                FEATURES_TABLE_OPTIONAL_COL,
                MISSING_COL
              )}
            >
              {FEATURES_GAP_HEADERS.missing}
            </TableHead>
            <TableHead
              className={cn(
                HEADER_CLASS,
                FEATURES_TABLE_OPTIONAL_COL,
                ACTION_COL
              )}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {FEATURES_GAP_ROWS.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="min-w-0 overflow-hidden py-3">
                <span className="block truncate text-sm font-medium">
                  {row.content}
                </span>
              </TableCell>
              <TableCell className={cn("py-3", OPPORTUNITY_COL)}>
                <GapMeter
                  label={`${row.mentionRate}% mention rate, ${row.opportunity}/${GEO_GAPS_METER_STEPS} opportunity`}
                  level={row.opportunity}
                />
              </TableCell>
              <TableCell
                className={cn("py-3", FEATURES_TABLE_OPTIONAL_COL, MISSING_COL)}
              >
                <LogoStack
                  items={row.missing.map((engine) => ({
                    key: engine,
                    label: GEO_ENGINE_NAMES[engine],
                    renderIcon: (className) => (
                      <EngineIcon className={className} engine={engine} />
                    ),
                  }))}
                />
              </TableCell>
              <TableCell
                className={cn("py-3", FEATURES_TABLE_OPTIONAL_COL, ACTION_COL)}
              >
                <Button size="sm" variant="outline">
                  {FEATURES_GAP_HEADERS.action}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MockFrame>
  );
}
