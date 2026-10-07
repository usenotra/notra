"use client";

import { SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { parseClickHouseDateTime } from "@notra/analytics/utils/datetime";
import {
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
  GEO_SPARKLINE_MIN_POINTS,
} from "@notra/geo-core/constants/geo";
import type { GeoEngineFamily } from "@notra/geo-core/types/geo";
import { engineFamilyLabel } from "@notra/geo-core/utils/geo-engine-family";
import { FadeSwap } from "@notra/ui/components/fade-swap";
import {
  InstrumentEmpty,
  InstrumentSection,
} from "@notra/ui/components/instrument/instrument-module";
import {
  DataTable,
  type TableColumn,
} from "@notra/ui/components/ui/data-table";
import { Input } from "@notra/ui/components/ui/input";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { EngineFamilySheet } from "@/components/geo/engine-family-sheet";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { RelativeTime } from "@/components/relative-time";
import { EMPTY_STATE_TABLE_COLUMNS } from "@/constants/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { EngineRateTableProps } from "@/types/geo";
import {
  engineFamilyAvgPosition,
  engineFamilyCitationTotal,
  engineFamilyLastCheckedAt,
  engineFamilyStatTrends,
  engineFamilyTotals,
  formatMentionRate,
  groupEngineFamilies,
  keepTrackedFamilies,
  mentionRateSparkline,
} from "@/utils/geo-charts";
import { tableHeightFor } from "@/utils/table";

const NOT_SCANNED_RATE = -1;

/** Rate and the change in it. */
function VisibilityCell({
  family,
  timeseriesPoints,
}: {
  family: GeoEngineFamily;
  timeseriesPoints: EngineRateTableProps["timeseriesPoints"];
}) {
  const t = useTranslations("geo.engineRateTable");
  const tGeoShared = useTranslations("geo.shared");
  const totals = engineFamilyTotals(family);
  if (!totals) {
    return (
      <span className="text-muted-foreground text-xs">
        {tGeoShared("notScanned")}
      </span>
    );
  }
  const trends = engineFamilyStatTrends(
    timeseriesPoints ?? GEO_EMPTY_TIMESERIES,
    family.family
  );
  return (
    <span className="flex min-w-0 items-center justify-end gap-2">
      <FadeSwap
        className="text-sm font-medium tabular-nums"
        swapKey={formatMentionRate(totals.rate)}
        value={totals.rate}
      >
        {formatMentionRate(totals.rate)}
      </FadeSwap>
      <GeoStatDelta
        animated
        delta={trends.visibilityDelta}
        hint={tGeoShared("vsFirstHalfOfThis")}
        label={t("visibilityLabel", {
          engine: engineFamilyLabel(family.family),
        })}
      />
    </span>
  );
}

function lastCheckedIso(family: GeoEngineFamily): string | null {
  const value = engineFamilyLastCheckedAt(family);
  if (!value) {
    return null;
  }
  const date = parseClickHouseDateTime(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function avgPositionOf(family: GeoEngineFamily): string {
  const position = engineFamilyAvgPosition(family);
  return position === null ? "-" : `#${position}`;
}

export function EngineRateTable({
  engines,
  trackedEngines,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  isScanning = false,
  organizationSlug,
  companyName,
  aliases,
  competitors,
}: EngineRateTableProps) {
  /*
   * Engines the workspace stopped scanning keep their old rows, so an
   * untracked engine sits here frozen at 0 visible / 0% and reads as a bad
   * result rather than an absent one. Only show what is still being scanned.
   */
  const families = useMemo(
    () => keepTrackedFamilies(groupEngineFamilies(engines), trackedEngines),
    [engines, trackedEngines]
  );
  const [selected, setSelected] = useState<GeoEngineFamily | null>(null);
  const [query, setQuery] = useState("");
  const t = useTranslations("geo.engineRateTable");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();

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
            ? t("columns.engineCount", { count: filtered.length })
            : tGeoShared("engine"),
        width: "1fr",
        sortable: true,
        cell: (row) => (
          <span className="flex min-w-0 items-center gap-2">
            <EngineIcon engine={row.family} />
            <span className="truncate font-medium">
              {engineFamilyLabel(row.family)}
            </span>
          </span>
        ),
        sortValue: (row) => engineFamilyLabel(row.family),
      },
      {
        key: "rate",
        header: tGeoShared("brandVisibility"),
        hint: t("hints.rate"),
        width: "10rem",
        align: "right",
        sortable: true,
        cell: (row) => (
          <VisibilityCell family={row} timeseriesPoints={timeseriesPoints} />
        ),
        sortValue: (row) => engineFamilyTotals(row)?.rate ?? NOT_SCANNED_RATE,
      },
      {
        key: "lastChecked",
        collapsePriority: 4,
        header: t("columns.lastChecked"),
        width: "8rem",
        sortable: true,
        cell: (row) => {
          const iso = lastCheckedIso(row);
          return iso ? (
            <RelativeTime iso={iso} />
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          );
        },
        sortValue: (row) => lastCheckedIso(row) ?? "",
      },
      {
        key: "citations",
        collapsePriority: 3,
        header: tGeoShared("citations"),
        hint: t("hints.citations"),
        width: "7rem",
        sortable: true,
        cell: (row) => {
          if (!engineFamilyTotals(row)) {
            return (
              <span className="text-muted-foreground text-xs">
                {tGeoShared("notScanned")}
              </span>
            );
          }
          return (
            <FadeSwap
              className="text-sm tabular-nums"
              swapKey={String(engineFamilyCitationTotal(row))}
              value={engineFamilyCitationTotal(row)}
            >
              {engineFamilyCitationTotal(row).toLocaleString(locale)}
            </FadeSwap>
          );
        },
        sortValue: (row) =>
          engineFamilyTotals(row) ? engineFamilyCitationTotal(row) : -1,
      },
      {
        key: "avgPosition",
        collapsePriority: 2,
        header: tGeoShared("avgPosition"),
        hint: t("hints.avgPosition"),
        width: "7.5rem",
        sortable: true,
        cell: (row) => (
          <span className="text-sm tabular-nums">{avgPositionOf(row)}</span>
        ),
        sortValue: (row) =>
          engineFamilyAvgPosition(row) ?? Number.MAX_SAFE_INTEGER,
      },
      {
        key: "trend",
        collapsePriority: 1,
        header: tGeoShared("trendLabel"),
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
    [filtered.length, locale, t, timeseriesPoints]
  );

  const emptyReadout = isScanning
    ? t("readoutScanning")
    : tGeoShared("noScansYet");
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
              aria-label={t("filterLabel")}
              className="h-7 pr-2.5 pl-8 text-xs"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filterPlaceholder")}
              value={query}
            />
          </div>
        ) : undefined
      }
      className="h-full"
      eyebrow={tGeoShared("engines")}
      hint={t("hint")}
      readout={readout}
    >
      {families.length === 0 ? (
        <InstrumentEmpty
          busy={isScanning}
          className="h-40"
          message={isScanning ? tGeoShared("scanningEngines") : t("empty")}
          preview={
            <div className="px-6 pt-2">
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.engines}
                rows={3}
              />
            </div>
          }
          seed={t("emptySeed")}
        />
      ) : (
        <div className="flex flex-col gap-2">
          <DataTable
            columns={columns}
            data={filtered}
            defaultSort={{ key: "rate", direction: "desc" }}
            emptyState={t("noMatches")}
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
