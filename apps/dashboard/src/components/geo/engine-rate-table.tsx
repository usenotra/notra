"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
  GEO_ENGINE_PERFORMANCE_HINT,
  GEO_FAMILY_STAT_TREND_HINT,
  GEO_SPARKLINE_MIN_POINTS,
} from "@notra/geo-core/constants/geo";
import type { GeoEngineFamily } from "@notra/geo-core/types/geo";
import { formatAiTrafficTimestamp } from "@notra/geo-core/utils/ai-traffic";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { Input } from "@notra/ui/components/ui/input";
import { useMemo, useState } from "react";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { EngineFamilySheet } from "@/components/geo/engine-family-sheet";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { EMPTY_STATE_TABLE_COLUMNS } from "@/constants/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { EngineRateTableProps } from "@/types/geo";
import {
  engineFamilyAvgPosition,
  engineFamilyLastCheckedAt,
  engineFamilyStatTrends,
  engineFamilyTotals,
  formatMentionRate,
  groupEngineFamilies,
  mentionRateSparkline,
} from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const NOT_SCANNED_RATE = -1;

function RateCell({ family }: { family: GeoEngineFamily }) {
  const totals = engineFamilyTotals(family);
  if (!totals) {
    return <span className="text-muted-foreground text-xs">Not scanned</span>;
  }

  return (
    <span className="flex items-center gap-2">
      <GeoBar className="w-24 shrink-0" value={totals.rate} />
      <span className="text-sm tabular-nums">
        {formatMentionRate(totals.rate)}
      </span>
    </span>
  );
}

function lastCheckedOf(family: GeoEngineFamily): string {
  const value = engineFamilyLastCheckedAt(family);
  return value ? formatAiTrafficTimestamp(value) : "-";
}

function avgPositionOf(family: GeoEngineFamily): string {
  const position = engineFamilyAvgPosition(family);
  return position === null ? "-" : `#${position}`;
}

export function EngineRateTable({
  engines,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  isScanning = false,
  organizationSlug,
  companyName,
  aliases,
  competitors,
}: EngineRateTableProps) {
  const families = useMemo(() => groupEngineFamilies(engines), [engines]);
  const [selected, setSelected] = useState<GeoEngineFamily | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return families;
    }
    return families.filter((family) =>
      engineFamilyLabel(family.family).toLowerCase().includes(needle)
    );
  }, [families, query]);

  const columns = useMemo<TableColumn<GeoEngineFamily>[]>(
    () => [
      {
        key: "family",
        header:
          filtered.length > 0
            ? `Engine (${filtered.length.toLocaleString()})`
            : "Engine",
        width: "1fr",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <EngineIcon engine={row.family} />
            <span className="truncate">{engineFamilyLabel(row.family)}</span>
          </span>
        ),
        sortValue: (row) => engineFamilyLabel(row.family),
      },
      {
        key: "mentions",
        header: "Mentions",
        width: "10rem",
        sortable: true,
        cell: (row) => {
          const totals = engineFamilyTotals(row);
          const trends = engineFamilyStatTrends(timeseriesPoints, row.family);
          if (!totals) {
            return (
              <span className="text-muted-foreground text-xs">Not scanned</span>
            );
          }
          return (
            <span className="flex items-center gap-2">
              <span className="text-sm tabular-nums">
                {totals.mentions.toLocaleString()}
              </span>
              <GeoStatDelta
                delta={trends.mentionDelta}
                hint={GEO_FAMILY_STAT_TREND_HINT}
                label={`${engineFamilyLabel(row.family)} mentions`}
              />
            </span>
          );
        },
        sortValue: (row) => engineFamilyTotals(row)?.mentions ?? -1,
      },
      {
        key: "rate",
        header: "Mention rate",
        width: "1.4fr",
        sortable: true,
        cell: (row) => <RateCell family={row} />,
        sortValue: (row) => engineFamilyTotals(row)?.rate ?? NOT_SCANNED_RATE,
      },
      {
        key: "avgPosition",
        header: "Avg position",
        width: "8.5rem",
        sortable: true,
        cell: (row) => (
          <span className="text-sm tabular-nums">{avgPositionOf(row)}</span>
        ),
        sortValue: (row) =>
          engineFamilyAvgPosition(row) ?? Number.MAX_SAFE_INTEGER,
      },
      {
        key: "lastChecked",
        header: "Last checked",
        width: "9.375rem",
        cell: (row) => (
          <span className="text-muted-foreground text-[0.6875rem] whitespace-nowrap tabular-nums">
            {lastCheckedOf(row)}
          </span>
        ),
      },
      {
        key: "trend",
        header: "Trend",
        width: "5.5rem",
        cell: (row) => {
          const points = mentionRateSparkline(timeseriesPoints, {
            family: row.family,
          });
          if (points.length < GEO_SPARKLINE_MIN_POINTS) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }
          return <GeoRateSparkline className="text-primary" points={points} />;
        },
      },
    ],
    [filtered.length, timeseriesPoints]
  );

  const emptyReadout = isScanning ? "scanning now" : "no scans yet";
  const readout = families.length > 0 ? undefined : emptyReadout;

  return (
    <InstrumentSection
      action={
        families.length > 0 ? (
          <div className="relative w-full sm:w-56">
            <HugeiconsIcon
              className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
              icon={SearchIcon}
              size={14}
            />
            <Input
              aria-label="Filter engines"
              className="h-7 pr-2.5 pl-8 text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by engine..."
              value={query}
            />
          </div>
        ) : undefined
      }
      className="h-full"
      eyebrow="Engines"
      hint={GEO_ENGINE_PERFORMANCE_HINT}
      readout={readout}
    >
      {families.length === 0 ? (
        <InstrumentEmpty
          busy={isScanning}
          className="h-40"
          message={geoScanEmptyMessage(
            isScanning,
            "Run a scan to see engine mention rates"
          )}
          preview={
            <div className="px-6 pt-2">
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.engines}
                rows={3}
              />
            </div>
          }
          seed="Mention rate by engine"
        />
      ) : (
        <div className="flex flex-col gap-2">
          <Table
            className="rounded-2xl"
            columns={columns}
            data={filtered}
            defaultSort={{ key: "mentions", direction: "desc" }}
            emptyState="No engines match this filter"
            getRowId={(row) => row.family}
            height={tableHeightFor(filtered.length)}
            onRowClick={setSelected}
            resizable
            rowHeight={TABLE_ROW_HEIGHT}
          />
        </div>
      )}
      <EngineFamilySheet
        aliases={aliases}
        companyName={companyName}
        competitors={competitors}
        family={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
        open={selected !== null}
        organizationSlug={organizationSlug}
        promptResults={promptResults}
        timeseriesPoints={timeseriesPoints}
      />
    </InstrumentSection>
  );
}
