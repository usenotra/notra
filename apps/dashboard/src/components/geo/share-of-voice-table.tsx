"use client";

import {
  GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES,
  GEO_FAMILY_STAT_TREND_HINT,
  GEO_SPARKLINE_MIN_POINTS,
} from "@notra/geo-core/constants/geo";
import type { ShareOfVoiceRow } from "@notra/geo-core/types/geo";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { GeoBar } from "@notra/ui/components/geo/geo-bar";
import { useMemo } from "react";

import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { GeoRateSparkline } from "@/components/geo/geo-rate-sparkline";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { InstrumentEmpty } from "@/components/instrument/instrument-module";
import { Table, type TableColumn } from "@/components/motion/table";
import { EMPTY_STATE_TABLE_COLUMNS } from "@/constants/empty-state";
import { TABLE_ROW_HEIGHT } from "@/constants/table";
import type { ShareOfVoiceTableProps } from "@/types/geo";
import { geoModeFillClass } from "@/utils/chart-colors";
import {
  buildShareOfVoiceRows,
  formatMentionRate,
  mentionCountDelta,
} from "@/utils/geo-charts";
import {
  buildShareOfVoiceMentionSparklines,
  isOwnBrandName,
  shareOfVoiceRivalIndex,
  shareOfVoiceSliceColor,
} from "@/utils/geo-competitors";
import { GEO_VISIBILITY_TABLE_HEIGHT } from "@/utils/table";

export function ShareOfVoiceTable({
  points,
  timeseries = GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES,
  competitors,
  limit,
  isScanning = false,
  onRowClick,
  onRowPointerEnter,
  companyName,
  aliases,
}: ShareOfVoiceTableProps) {
  const rows = buildShareOfVoiceRows(points, {
    limit,
    competitors,
    companyName,
    aliases,
  });
  const mentionSparklines = useMemo(
    () => buildShareOfVoiceMentionSparklines(timeseries, rows, competitors),
    [competitors, rows, timeseries]
  );
  const ownBrand = useMemo(
    () => ({ companyName, aliases }),
    [aliases, companyName]
  );
  const maxShare = rows.reduce((max, row) => Math.max(max, row.share), 0);

  const columns: TableColumn<ShareOfVoiceRow>[] = [
    {
      key: "brand",
      header: "Brand",
      width: "1fr",
      sortable: true,
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2 text-sm">
          {row.kind === "brand" && (
            <CompetitorLogo
              className="size-4 shrink-0"
              competitors={competitors}
              name={row.brand}
            />
          )}
          <span className="truncate">{row.brand}</span>
        </span>
      ),
    },
    {
      key: "share",
      header: "Share",
      width: "1.3fr",
      sortable: true,
      sortValue: (row) => row.share,
      cell: (row) => {
        const own =
          row.kind === "brand" &&
          isOwnBrandName(row.brand, companyName, aliases);
        const color = shareOfVoiceSliceColor(
          row,
          shareOfVoiceRivalIndex(rows, row.brand, ownBrand),
          competitors,
          ownBrand
        );
        return (
          <span className="flex items-center gap-2">
            <GeoBar
              className="h-2 max-w-40"
              fillClassName={own ? geoModeFillClass("web") : undefined}
              fillColor={own ? undefined : color.light}
              max={maxShare}
              value={row.share}
            />
            <span className="shrink-0 text-xs tabular-nums">
              {formatMentionRate(row.share)}
            </span>
          </span>
        );
      },
    },
    {
      key: "mentions",
      header: "Mentions",
      width: "10.5rem",
      sortable: true,
      cell: (row) => {
        const series = mentionSparklines.get(row.id) ?? [];

        return (
          <span className="flex items-center gap-2">
            <span className="w-12 shrink-0 text-right text-sm tabular-nums">
              {row.mentions.toLocaleString()}
            </span>
            <GeoStatDelta
              delta={mentionCountDelta(series)}
              hint={GEO_FAMILY_STAT_TREND_HINT}
              label={`${row.brand} mentions`}
            />
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      width: "5.5rem",
      cell: (row) => {
        if (row.trend.length < GEO_SPARKLINE_MIN_POINTS) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }
        const own =
          row.kind === "brand" &&
          isOwnBrandName(row.brand, companyName, aliases);
        const color = shareOfVoiceSliceColor(
          row,
          shareOfVoiceRivalIndex(rows, row.brand, ownBrand),
          competitors,
          ownBrand
        );
        return (
          <GeoRateSparkline
            className={own ? "text-primary" : undefined}
            color={own ? undefined : color.light}
            label={`${row.brand} share of voice trend`}
            points={row.trend}
          />
        );
      },
    },
  ];

  if (rows.length === 0) {
    return (
      <InstrumentEmpty
        busy={isScanning}
        className="h-full"
        message={geoScanEmptyMessage(
          isScanning,
          "Run a scan to see your share of voice"
        )}
        preview={
          <div className="px-4 pt-2">
            <EmptyStateTablePreview
              columns={EMPTY_STATE_TABLE_COLUMNS.shareOfVoice}
              rows={4}
            />
          </div>
        }
        seed="Share of voice"
      />
    );
  }

  return (
    <Table
      className="rounded-2xl"
      columns={columns}
      data={rows}
      defaultSort={{ key: "share", direction: "desc" }}
      emptyState="No competitor data yet"
      getRowId={(row) => row.id}
      height={GEO_VISIBILITY_TABLE_HEIGHT}
      minHeight={GEO_VISIBILITY_TABLE_HEIGHT}
      onRowClick={onRowClick}
      onRowPointerEnter={onRowPointerEnter}
      resizable
      rowHeight={TABLE_ROW_HEIGHT}
    />
  );
}
