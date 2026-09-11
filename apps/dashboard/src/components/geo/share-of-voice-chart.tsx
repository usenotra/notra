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
import { ProjectLogo } from "@/components/geo/project-logo";
import { TrackBrandButton } from "@/components/geo/share-of-voice-brand-tag";
import { ShareOfVoiceBrandsDialog } from "@/components/geo/share-of-voice-brands-dialog";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { cn } from "@/lib/utils";
import type {
  ShareOfVoiceChartProps,
  ShareOfVoiceRankingRowProps,
} from "@/types/geo";
import { formatChartInteger, formatUsageShare } from "@/utils/geo-charts";
import { findOwnBrandDomain } from "@/utils/geo-competitors";
import { buildShareOfVoiceChartModel } from "@/utils/geo-share-of-voice";

const RANKING_GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-x-3 @sm:grid-cols-[1.5rem_minmax(0,1fr)_auto_auto_auto]";
const RANKING_SUBGRID = "col-span-full grid grid-cols-subgrid items-center";
const RANKING_MAIN_SPAN = "col-span-3 grid grid-cols-subgrid @sm:col-span-4";

function RankingBrandMark({
  row,
  competitors,
  ownDomain,
}: Pick<ShareOfVoiceRankingRowProps, "row" | "competitors" | "ownDomain">) {
  if (row.own) {
    return (
      <ProjectLogo
        className="size-6 shrink-0 rounded-md"
        domain={ownDomain ?? null}
        fallbackClassName="bg-background p-1 ring-1 ring-foreground/10"
        name={row.brand}
      />
    );
  }
  return (
    <CompetitorLogo
      className="size-6 shrink-0 rounded-md"
      competitors={competitors}
      name={row.brand}
    />
  );
}

function ShareOfVoiceRankingRow({
  row,
  competitors,
  ownDomain,
  onOpen,
  onPrefetch,
  onTrack,
}: ShareOfVoiceRankingRowProps) {
  const content = (
    <>
      <span className="text-muted-foreground text-xs tabular-nums">
        {row.rank ?? "—"}
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <RankingBrandMark
          competitors={competitors}
          ownDomain={ownDomain}
          row={row}
        />
        <span className="min-w-0 truncate text-sm" title={row.brand}>
          {row.brand}
        </span>
      </span>
      <span className="text-right text-sm tabular-nums">
        {formatUsageShare(row.share)}
      </span>
      <span className="text-muted-foreground hidden text-right text-xs tabular-nums @sm:block">
        {formatChartInteger(row.mentions)}
        <span className="sr-only"> mentions</span>
      </span>
    </>
  );
  return (
    <li
      className={cn(
        RANKING_SUBGRID,
        "border-border min-h-12 border-b last:border-b-0",
        row.own && "bg-primary/5 rounded-lg border-b-0"
      )}
    >
      {onOpen ? (
        <button
          className={cn(
            RANKING_MAIN_SPAN,
            "hover:bg-muted/50 min-h-12 cursor-pointer rounded-lg border-0 bg-transparent p-0 text-left transition-colors"
          )}
          onClick={() => onOpen(row)}
          onFocus={() => onPrefetch?.(row)}
          onPointerEnter={() => onPrefetch?.(row)}
          type="button"
        >
          {content}
        </button>
      ) : (
        <div className={cn(RANKING_MAIN_SPAN, "min-h-12")}>{content}</div>
      )}
      <span className="flex justify-end">
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
  const { domain: projectDomain } = useGeoActiveProject(organizationId ?? "");
  const ownDomain = projectDomain ?? findOwnBrandDomain(aliases ?? []);
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
            <div className={cn(RANKING_GRID, "mb-4 w-full")}>
              <div
                aria-hidden="true"
                className={cn(
                  RANKING_SUBGRID,
                  "text-muted-foreground border-border border-b pb-2 text-[0.6875rem]"
                )}
              >
                <span />
                <span>Brand</span>
                <span className="text-right">Share</span>
                <span className="hidden text-right @sm:block">Mentions</span>
                <span />
              </div>
              <ol
                aria-label="Brand ranking by share of voice"
                className={cn(RANKING_SUBGRID, "list-none p-0")}
              >
                {ranking.map((row) => (
                  <ShareOfVoiceRankingRow
                    competitors={competitors}
                    key={row.id}
                    onOpen={onSliceClick}
                    onPrefetch={onSlicePointerEnter}
                    onTrack={organizationId ? setTrackBrand : undefined}
                    ownDomain={ownDomain}
                    row={row}
                  />
                ))}
              </ol>
            </div>
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
          ownDomain={ownDomain}
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
