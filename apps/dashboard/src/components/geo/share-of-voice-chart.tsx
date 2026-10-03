"use client";

import {
  Loading03Icon,
  PieChart01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_MENTION_FADE_HEIGHT_REM,
  GEO_MENTION_ROW_HEIGHT_REM,
  GEO_MENTION_SUMMARY_VISIBLE,
} from "@notra/geo-core/constants/geo";
import { DetailCardContent } from "@notra/ui/components/ui/detail-card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@notra/ui/components/ui/empty";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import { type CSSProperties, useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { Button } from "@/components/button";
import { ChartColorScope } from "@/components/charts/chart-color-scope";
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart";
import { CompetitorEditDialog } from "@/components/geo/competitor-edit-dialog";
import { CompetitorLogo } from "@/components/geo/competitor-logo";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { ProjectLogo } from "@/components/geo/project-logo";
import { InstrumentModule } from "@/components/instrument/instrument-module";
import { useGeoActiveProject } from "@/lib/hooks/use-geo-active-project";
import { useScrollOverflow } from "@/lib/hooks/use-scroll-overflow";
import { cn } from "@/lib/utils";
import type {
  ShareOfVoiceChartProps,
  ShareOfVoiceRankingRowProps,
} from "@/types/geo";
import { softGradientColors } from "@/utils/chart-colors";
import { formatChartInteger, formatUsageShare } from "@/utils/geo-charts";
import { findOwnBrandDomain } from "@/utils/geo-competitors";
import { buildShareOfVoiceChartModel } from "@/utils/geo-share-of-voice";

const RANKING_ROW_STYLE = {
  height: `${GEO_MENTION_ROW_HEIGHT_REM}rem`,
} as const;
const RANKING_LIST_STYLE = {
  maxHeight: `${GEO_MENTION_SUMMARY_VISIBLE * GEO_MENTION_ROW_HEIGHT_REM + GEO_MENTION_FADE_HEIGHT_REM}rem`,
  scrollbarWidth: "none",
} as const;
const RANKING_FADE_STYLE = {
  height: `${GEO_MENTION_FADE_HEIGHT_REM}rem`,
} as const;

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
  slice,
}: ShareOfVoiceRankingRowProps & { slice: string }) {
  const t = useTranslations("geo.shareOfVoiceChart");
  const tTag = useTranslations("geo.shareOfVoiceBrandTag");
  const tGeoShared = useTranslations("geo.shared");
  const locale = useLocale();
  const buttonProps = {
    className: cn(
      "border-border grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-1.5 border-b pr-2 text-left transition-colors",
      row.own ? "bg-primary/5" : undefined,
      onOpen
        ? cn(
            "cursor-pointer",
            row.own ? "hover:bg-primary/10" : "hover:bg-muted/50"
          )
        : "cursor-default"
    ),
    disabled: !onOpen,
    onClick: onOpen ? () => onOpen(row) : undefined,
    onFocus: onOpen ? () => onPrefetch?.(row) : undefined,
    onPointerEnter: onOpen ? () => onPrefetch?.(row) : undefined,
    style: RANKING_ROW_STYLE,
    type: "button",
  } as const;
  const content = (
    <>
      <span className="text-muted-foreground flex items-center justify-end gap-1.5 text-xs tabular-nums">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-(--legend-color)"
          style={
            {
              "--legend-color": `var(--color-${slice}-0)`,
            } as CSSProperties
          }
        />
        {row.rank ?? "—"}
      </span>
      <span className="flex min-w-0 items-center gap-2 pl-1">
        <RankingBrandMark
          competitors={competitors}
          ownDomain={ownDomain}
          row={row}
        />
        <span
          className="min-w-0 truncate text-sm font-medium"
          title={row.brand}
        >
          {row.brand}
        </span>
        {row.own ? (
          <span className="bg-primary/10 text-primary inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium">
            {tGeoShared("youLabel")}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-baseline justify-end gap-3 tabular-nums">
        <span className="text-muted-foreground text-xs">
          {formatChartInteger(row.mentions, locale)}
          <span className="sr-only"> {t("mentionsSr")}</span>
        </span>
        <span
          className={cn(
            "w-12 text-right text-sm",
            row.mentions === 0 && "text-muted-foreground"
          )}
        >
          {formatUsageShare(row.share)}
        </span>
      </span>
    </>
  );

  if (row.own || row.tracked || !onTrack) {
    return <button {...buttonProps}>{content}</button>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger render={<button {...buttonProps} />}>
        {content}
      </HoverCardTrigger>
      <DetailCardContent
        aside={
          <Button
            aria-label={tTag("trackBrand", { brand: row.brand })}
            onClick={() => onTrack(row.brand)}
            size="xs"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon
              data-icon="inline-start"
              icon={PlusSignIcon}
              strokeWidth={2}
            />
            {tGeoShared("track")}
          </Button>
        }
        icon={
          <CompetitorLogo
            className="size-4 rounded-sm"
            competitors={competitors}
            name={row.brand}
          />
        }
        title={row.brand}
      >
        <p className="text-muted-foreground px-3 py-1.5 text-xs text-pretty">
          {tGeoShared("discoveredBrandsComeFromScan")}
        </p>
      </DetailCardContent>
    </HoverCard>
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
  const t = useTranslations("geo.shareOfVoiceChart");
  const tGeoShared = useTranslations("geo.shared");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [trackBrand, setTrackBrand] = useState<string | null>(null);
  const { domain: projectDomain } = useGeoActiveProject(organizationId ?? "");
  const ownDomain = projectDomain ?? findOwnBrandDomain(aliases ?? []);
  const {
    ranking,
    allRanked: allBrands,
    own,
    slices,
    other,
    config,
    totalMentions,
    brandCount,
    shareDelta,
    rankDelta,
  } = buildShareOfVoiceChartModel(props, tGeoShared("otherBrands"));
  const summary = own ?? ranking[0];
  const sliceById = new Map(slices.map((row) => [row.id, row.slice]));
  // Brands folded into "Other" in the donut share its gray swatch.
  const otherSlice = other ? (sliceById.get(other.id) ?? "") : "";
  const donutConfig = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [
      key,
      item.colors ? { ...item, colors: softGradientColors(item.colors) } : item,
    ])
  );
  const { ref: listRef, atEnd } = useScrollOverflow<HTMLDivElement>(
    allBrands.length
  );

  if (totalMentions === 0) {
    return (
      <>
        <Empty className="border-border rounded-2xl border py-12 md:py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                className={isScanning ? "motion-safe:animate-spin" : undefined}
                icon={isScanning ? Loading03Icon : PieChart01Icon}
              />
            </EmptyMedia>
            <EmptyTitle>
              {isScanning ? t("emptyScanningTitle") : t("emptyTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {isScanning
                ? tGeoShared("scanningEngines")
                : t("emptyDescription")}
            </EmptyDescription>
          </EmptyHeader>
          {organizationId && !isScanning ? (
            <EmptyContent>
              <Button onClick={() => setTrackBrand("")} size="sm">
                <HugeiconsIcon icon={PlusSignIcon} size={14} />
                {tGeoShared("addCompetitor")}
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
        {organizationId ? (
          <CompetitorEditDialog
            competitor={null}
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

  return (
    <>
      <div className="@container">
        <div className="grid items-stretch gap-4 @3xl:grid-cols-2">
          <InstrumentModule
            className="@container"
            eyebrow={companyName ? t("yourShare") : t("leadingShare")}
            hint={t("shareHint")}
            readout={`${formatChartInteger(totalMentions, locale)} ${t("totalMentions")}`}
            variant="table"
            bodyClassName="flex flex-col items-center justify-center p-5"
          >
            <div className="relative w-full max-w-80">
              <EChartsPieChart
                animation={false}
                className="h-72 w-full"
                config={donutConfig}
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
                <span className="text-3xl font-medium tracking-tight tabular-nums">
                  {formatUsageShare(summary?.share ?? 0)}
                </span>
                <span className="text-muted-foreground max-w-40 truncate text-xs">
                  {summary?.brand}
                </span>
                {own ? (
                  <span className="pointer-events-auto mt-1">
                    <GeoStatDelta
                      delta={shareDelta}
                      hint={tGeoShared("vsFirstHalfOfThis")}
                      kind="rate"
                      label={tGeoShared("shareOfVoice")}
                    />
                  </span>
                ) : null}
              </div>
            </div>
          </InstrumentModule>
          <InstrumentModule
            className="@container"
            eyebrow={companyName ? t("yourRank") : tGeoShared("brandRanking")}
            hint={t("rankHint")}
            variant="table"
            bodyClassName="flex flex-col p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span className="text-3xl font-medium tracking-tight tabular-nums">
                  {summary?.rank ? `#${summary.rank}` : "—"}
                </span>
                {own ? (
                  <GeoStatDelta
                    delta={rankDelta}
                    hint={tGeoShared("vsFirstHalfOfThis")}
                    kind="position"
                    label={tCommon("labels.rank")}
                  />
                ) : null}
              </span>
              {summary?.rank ? (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t("ofBrands", {
                    count: formatChartInteger(brandCount, locale),
                  })}
                </span>
              ) : null}
            </div>
            <ChartColorScope
              className="flex flex-1 flex-col gap-1"
              config={config}
            >
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>{tCommon("labels.brand")}</span>
                <span>{tGeoShared("share")}</span>
              </div>
              <div className="relative">
                <div
                  aria-label={t("tableLabel")}
                  className="border-border focus-visible:ring-ring relative overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 [&::-webkit-scrollbar]:hidden [&>button:last-of-type]:border-b-0"
                  ref={listRef}
                  role="region"
                  style={RANKING_LIST_STYLE}
                  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scroll region must support keyboard scrolling.
                  tabIndex={0}
                >
                  {allBrands.map((row) => (
                    <ShareOfVoiceRankingRow
                      competitors={competitors}
                      key={row.id}
                      onOpen={onSliceClick}
                      onPrefetch={onSlicePointerEnter}
                      onTrack={organizationId ? setTrackBrand : undefined}
                      ownDomain={ownDomain}
                      row={row}
                      slice={sliceById.get(row.id) ?? otherSlice}
                    />
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className={cn(
                    "from-card pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t to-transparent transition-opacity duration-200 motion-reduce:transition-none",
                    atEnd ? "opacity-0" : "opacity-100"
                  )}
                  style={RANKING_FADE_STYLE}
                />
              </div>
            </ChartColorScope>
          </InstrumentModule>
        </div>
      </div>
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
