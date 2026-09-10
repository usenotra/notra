"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { useState } from "react";

import { Button } from "@/components/button";
import { ChartColorScope } from "@/components/charts/chart-color-scope";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import { CompetitorEditDialog } from "@/components/geo/competitor-edit-dialog";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { TrackBrandButton } from "@/components/geo/share-of-voice-brand-tag";
import { ShareOfVoiceBrandsDialog } from "@/components/geo/share-of-voice-brands-dialog";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { cn } from "@/lib/utils";
import type {
  ShareOfVoiceChartProps,
  ShareOfVoiceRankingRowProps,
} from "@/types/geo";
import { formatChartInteger, formatUsageShare } from "@/utils/geo-charts";
import { buildShareOfVoiceChartModel } from "@/utils/geo-share-of-voice";

function ShareOfVoiceRankingRow({
  row,
  competitors,
  onOpen,
  onPrefetch,
  onTrack,
}: ShareOfVoiceRankingRowProps) {
  const content = (
    <>
      <span className="text-muted-foreground w-6 shrink-0 text-xs tabular-nums">
        {row.rank ?? "—"}
      </span>
      <CompetitorLogo
        className="size-5 shrink-0"
        competitors={competitors}
        name={row.brand}
      />
      <span className="min-w-0 flex-1 truncate text-sm" title={row.brand}>
        {row.brand}
      </span>
      <span className="w-14 shrink-0 text-right text-sm tabular-nums">
        {formatUsageShare(row.share)}
      </span>
    </>
  );
  return (
    <li
      className={cn(
        "border-border flex items-center gap-2 border-b last:border-b-0",
        row.own && "bg-primary/5 rounded-lg border-b-0"
      )}
    >
      {onOpen ? (
        <button
          className="hover:bg-muted/50 flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2 text-left transition-colors"
          onClick={() => onOpen(row)}
          onFocus={() => onPrefetch?.(row)}
          onPointerEnter={() => onPrefetch?.(row)}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2">
          {content}
        </div>
      )}
      <span className="text-muted-foreground hidden w-12 shrink-0 text-right text-xs tabular-nums @sm:block">
        {formatChartInteger(row.mentions)}
        <span className="sr-only"> mentions</span>
      </span>
      <span className="flex w-8 shrink-0 justify-end @sm:w-16">
        {row.own ? (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[0.6875rem]">
            You
          </span>
        ) : null}
        {!row.own && !row.tracked && onTrack ? (
          <TrackBrandButton
            brand={row.brand}
            className="[&_[data-track-label]]:hidden @sm:[&_[data-track-label]]:inline"
            onTrack={onTrack}
          />
        ) : null}
      </span>
    </li>
  );
}

export function ShareOfVoiceChart(props: ShareOfVoiceChartProps) {
  const {
    competitors,
    companyName,
    aliases,
    isScanning = false,
    onSliceClick,
    onSlicePointerEnter,
    organizationId,
  } = props;
  const [otherOpen, setOtherOpen] = useState(false);
  const [trackBrand, setTrackBrand] = useState<string | null>(null);
  const { ranking, own, slices, others, other, config, totalMentions } =
    buildShareOfVoiceChartModel(props);
  const summary = own ?? ranking[0];

  if (totalMentions === 0) {
    return (
      <InstrumentEmpty
        busy={isScanning}
        className="h-64"
        message={geoScanEmptyMessage(
          isScanning,
          "Run a scan to see your share of voice"
        )}
        seed="Share of voice"
      />
    );
  }

  return (
    <>
      <div className="@container">
        <div className="grid items-stretch gap-4 @4xl:grid-cols-2">
          <InstrumentModule
            className="@container"
            eyebrow={
              companyName ? "Your share of voice" : "Leading share of voice"
            }
            hint="Share of recorded brand mentions in the selected period."
            variant="table"
            bodyClassName="flex flex-col p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-3xl font-medium tracking-tight tabular-nums">
                {formatUsageShare(summary?.share ?? 0)}
              </span>
            </div>
            <div className="relative mx-auto my-2 w-full max-w-72">
              <EChartsPieChart
                animation={false}
                className="h-64 w-full"
                config={config}
                data={slices.filter((row) => row.mentions > 0)}
                dataKey="mentions"
                nameKey="slice"
              >
                <EChartsPieChart.Pie
                  innerRadius="76%"
                  outerRadius="88%"
                  cornerRadius={12}
                  paddingAngle={4}
                />
                <EChartsPieChart.Tooltip
                  roundness="xl"
                  valueFormatter={(value) =>
                    formatUsageShare(value / totalMentions)
                  }
                />
              </EChartsPieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-xl font-medium tabular-nums">
                  {formatChartInteger(totalMentions)}
                </span>
                <span className="text-muted-foreground text-xs">
                  Total mentions
                </span>
              </div>
            </div>
            <ChartColorScope className="mt-auto" config={config}>
              <ul
                aria-label="Share of voice chart legend"
                className="flex flex-wrap justify-center gap-x-4 gap-y-2 pt-2"
              >
                {slices.map((row) => (
                  <li
                    className="flex min-w-0 items-center gap-1.5 text-xs"
                    key={row.slice}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: `var(--color-${row.slice}-0)` }}
                    />
                    <span
                      className="text-muted-foreground max-w-32 truncate"
                      title={row.brand}
                    >
                      {row.brand}
                    </span>
                    <span className="sr-only">
                      {formatUsageShare(row.share)}
                    </span>
                  </li>
                ))}
              </ul>
            </ChartColorScope>
          </InstrumentModule>
          <InstrumentModule
            className="@container"
            eyebrow={companyName ? "Your rank" : "Brand ranking"}
            hint="Rank by total mentions in the selected period. Brands with equal mentions share a rank."
            variant="table"
            bodyClassName="flex flex-col p-5"
          >
            <div className="mb-5 flex items-baseline justify-between gap-3">
              <span className="text-3xl font-medium tracking-tight tabular-nums">
                {summary?.rank ? `#${summary.rank}` : "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                {summary?.rank
                  ? "By share of mentions"
                  : "No mentions recorded"}
              </span>
            </div>
            <div
              aria-hidden="true"
              className="text-muted-foreground border-border flex gap-2 border-b px-2 pr-10 pb-2 text-[0.6875rem] @sm:pr-18"
            >
              <span className="min-w-0 flex-1">Brand</span>
              <span className="w-14 text-right">Share</span>
              <span className="hidden w-12 text-right @sm:block">Mentions</span>
            </div>
            <ol aria-label="Brand ranking by share of voice" className="mb-4">
              {ranking.map((row) => (
                <ShareOfVoiceRankingRow
                  competitors={competitors}
                  key={row.id}
                  onOpen={onSliceClick}
                  onPrefetch={onSlicePointerEnter}
                  onTrack={organizationId ? setTrackBrand : undefined}
                  row={row}
                />
              ))}
            </ol>
            {other ? (
              <div className="mt-auto flex justify-end pt-2">
                <Button
                  onClick={() => setOtherOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  View {others.length} more
                  <HugeiconsIcon
                    aria-hidden="true"
                    className="size-3.5"
                    icon={ArrowRight01Icon}
                  />
                </Button>
              </div>
            ) : null}
          </InstrumentModule>
        </div>
      </div>
      {other ? (
        <ShareOfVoiceBrandsDialog
          aliases={aliases}
          companyName={companyName}
          competitors={competitors}
          onBrandClick={onSliceClick}
          onBrandPointerEnter={onSlicePointerEnter}
          onOpenChange={setOtherOpen}
          onTrackBrand={
            organizationId
              ? (brand) => {
                  setOtherOpen(false);
                  setTrackBrand(brand);
                }
              : undefined
          }
          open={otherOpen}
          other={other}
          others={others}
        />
      ) : null}
      {organizationId ? (
        <CompetitorEditDialog
          competitor={null}
          initialName={trackBrand ?? undefined}
          onOpenChange={(open) => {
            if (!open) {
              setTrackBrand(null);
            }
          }}
          open={trackBrand !== null}
          organizationId={organizationId}
        />
      ) : null}
    </>
  );
}
