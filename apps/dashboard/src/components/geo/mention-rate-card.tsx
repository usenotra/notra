"use client";

import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GEO_EMPTY_PROMPT_RESULTS,
  GEO_EMPTY_TIMESERIES,
  GEO_FAMILY_STAT_TREND_HINT,
  GEO_MAX_ENGINES,
  GEO_MENTION_FADE_HEIGHT_REM,
  GEO_MENTION_ROW_HEIGHT_REM,
  GEO_MENTION_SUMMARY_VISIBLE,
  GEO_MENTION_UNTRACKED_HINT,
  GEO_MENTIONS_LABEL,
  GEO_PROVIDER_COLUMN_LABEL,
  GEO_PROVIDER_MENTIONS_COLUMN_LABEL,
} from "@notra/geo-core/constants/geo";
import type { GeoEngineFamily } from "@notra/geo-core/types/geo";
import {
  engineFamilyLabel,
  engineFamilyOf,
} from "@notra/geo-core/utils/geo-engine-family";
import { resolveGeoZdrMode } from "@notra/geo-core/utils/geo-engines";
import { geoScanEmptyMessage } from "@notra/geo-core/utils/geo-scan";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  HoverCard,
  HoverCardTrigger,
} from "@notra/ui/components/ui/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@notra/ui/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/button";
import { EngineFamilySheet } from "@/components/geo/engine-family-sheet";
import { EngineIcon } from "@/components/geo/engine-icon";
import { GeoStatDelta } from "@/components/geo/geo-stat-delta";
import { StatusSpinner } from "@/components/geo/status-spinner";
import { TrafficBreakdownCard } from "@/components/geo/traffic-breakdown-card";
import {
  InstrumentEmpty,
  InstrumentModule,
} from "@/components/instrument/instrument-module";
import { GEO_TRAFFIC_HOVER_DELAY_MS } from "@/constants/geo-traffic-hover";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoModelCatalog,
  useGeoSettingsEngineAdd,
} from "@/lib/hooks/use-geo";
import { useScrollOverflow } from "@/lib/hooks/use-scroll-overflow";
import { cn } from "@/lib/utils";
import type {
  MentionProviderRowProps,
  MentionRateCardProps,
} from "@/types/geo";
import {
  buildMentionProviderRows,
  mentionOverviewTotals,
  mentionStatTrends,
  withTrackedMentionEngines,
} from "@/utils/geo-charts";

const ROW_STYLE = { height: `${GEO_MENTION_ROW_HEIGHT_REM}rem` } as const;
const LIST_STYLE = {
  maxHeight: `${GEO_MENTION_SUMMARY_VISIBLE * GEO_MENTION_ROW_HEIGHT_REM + GEO_MENTION_FADE_HEIGHT_REM}rem`,
  scrollbarWidth: "none",
} as const;

function ProviderRow({
  rank,
  row,
  onOpen,
  onTrack,
  trackEngine,
  trackingDisabled,
  tracking,
}: MentionProviderRowProps) {
  const { family, totals, mentionDelta, tracked } = row;
  const name = engineFamilyLabel(family.family);
  const clickable = totals.mentions > 0;
  const buttonProps = {
    "aria-disabled": !clickable,
    "aria-label": clickable
      ? `Open ${name} mention breakdown`
      : `${name}, no mentions`,
    className: cn(
      "grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-1.5 border-b text-left transition-colors",
      clickable ? "hover:bg-muted/50 cursor-pointer" : "cursor-default",
      !tracked && "opacity-50 hover:opacity-100"
    ),
    disabled: tracked && !clickable,
    onClick: clickable ? () => onOpen(family) : undefined,
    style: ROW_STYLE,
    type: "button",
  } as const;
  const content = (
    <>
      <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
        {rank}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center">
          <EngineIcon engine={family.family} />
        </span>
        <span className="truncate text-sm font-medium">{name}</span>
      </span>
      <span className="flex shrink-0 items-center justify-end gap-2">
        <span
          className={cn(
            "text-sm tabular-nums",
            totals.mentions === 0 && "text-muted-foreground"
          )}
        >
          {totals.mentions.toLocaleString()}
        </span>
        <GeoStatDelta delta={mentionDelta} label={`${name} mentions`} />
      </span>
    </>
  );

  if (tracked) {
    return <button {...buttonProps}>{content}</button>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={GEO_TRAFFIC_HOVER_DELAY_MS}
        render={<button {...buttonProps} />}
      >
        {content}
      </HoverCardTrigger>
      <TrafficBreakdownCard
        aside={
          trackEngine ? (
            <Button
              aria-label={`Track ${name}`}
              disabled={trackingDisabled}
              onClick={() => onTrack(trackEngine, name)}
              size="xs"
              type="button"
              variant="outline"
            >
              {tracking ? (
                <StatusSpinner />
              ) : (
                <HugeiconsIcon
                  data-icon="inline-start"
                  icon={PlusSignIcon}
                  strokeWidth={2}
                />
              )}
              Track
            </Button>
          ) : null
        }
        icon={<EngineIcon className="size-4" engine={family.family} />}
        title={name}
      >
        <p className="text-muted-foreground px-3 py-1.5 text-xs text-pretty">
          {GEO_MENTION_UNTRACKED_HINT}
        </p>
      </TrafficBreakdownCard>
    </HoverCard>
  );
}

export function MentionRateCard({
  engines,
  settings,
  trackedEngines,
  timeseriesPoints = GEO_EMPTY_TIMESERIES,
  promptResults = GEO_EMPTY_PROMPT_RESULTS,
  isScanning = false,
  organizationSlug,
  competitors,
}: MentionRateCardProps) {
  const organizationId = settings?.organizationId ?? "";
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const addEngine = useGeoSettingsEngineAdd(organizationId);
  const ranked = buildMentionProviderRows(engines, {
    trackedEngines,
    timeseriesPoints,
  });
  const trackableEngines = (() => {
    const result = new Map<string, string>();
    if (!catalog || !settings || settings.engines.length >= GEO_MAX_ENGINES) {
      return result;
    }

    const knownEngines = new Set<string>();
    const currentModelsByFamily = new Map<string, string[]>();
    for (const model of catalog.models) {
      knownEngines.add(model.id);
      const family = engineFamilyOf(model.id);
      const models = currentModelsByFamily.get(family) ?? [];
      models.push(model.id);
      currentModelsByFamily.set(family, models);
    }
    for (const row of ranked) {
      if (row.tracked) {
        continue;
      }
      const historicModels = row.family.variants.map(
        (variant) => variant.model
      );
      const currentModels = currentModelsByFamily.get(row.family.family) ?? [];
      const engine = [...historicModels, ...currentModels].find(
        (candidate) =>
          knownEngines.has(candidate) &&
          resolveGeoZdrMode(catalog, candidate, {
            enforceZdr: settings.enforceZdr,
            nonZdrApprovedEngines: settings.nonZdrApprovedEngines,
          }) !== null
      );
      if (engine) {
        result.set(row.family.family, engine);
      }
    }
    return result;
  })();
  const pendingFamily =
    addEngine.isPending && addEngine.variables
      ? engineFamilyOf(addEngine.variables)
      : undefined;
  const totals = mentionOverviewTotals(
    withTrackedMentionEngines(engines, trackedEngines)
  );
  const overviewDelta = mentionStatTrends(timeseriesPoints).mentionDelta;
  const [selected, setSelected] = useState<GeoEngineFamily | null>(null);
  const openFamily = (family: GeoEngineFamily) => {
    const row = ranked.find((entry) => entry.family.family === family.family);
    trackEvent(POSTHOG_EVENTS.GEO_ENGINE_FAMILY_OPENED, {
      engine_family: family.family,
      mention_rate: row?.totals.rate ?? null,
      mentions: row?.totals.mentions ?? null,
      tracked: row?.tracked ?? null,
    });
    setSelected(family);
  };
  const trackEngine = (engine: string, name: string) => {
    if (addEngine.isPending) {
      return;
    }
    addEngine.mutate(engine, {
      onSuccess: () => toast.success(`${name} added to tracking`),
    });
  };
  const { ref, atEnd } = useScrollOverflow<HTMLDivElement>(ranked.length);

  return (
    <div className="relative h-full">
      <InstrumentModule
        className="h-full"
        eyebrow={GEO_MENTIONS_LABEL}
        variant="table"
      >
        {ranked.length === 0 || !totals ? (
          <InstrumentEmpty
            busy={isScanning}
            className="h-40"
            message={geoScanEmptyMessage(isScanning, "No scans yet")}
            seed="Mentions"
          />
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-end gap-2">
              <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums">
                {totals.mentions.toLocaleString()}
              </p>
              <GeoStatDelta
                className="mb-0.5"
                delta={overviewDelta}
                hint={GEO_FAMILY_STAT_TREND_HINT}
                label={GEO_MENTIONS_LABEL}
              />
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>{GEO_PROVIDER_COLUMN_LABEL}</span>
                <span>{GEO_PROVIDER_MENTIONS_COLUMN_LABEL}</span>
              </div>
              <div className="relative">
                <div
                  aria-label="Mentions by provider"
                  className="border-border focus-visible:ring-ring relative overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 [&::-webkit-scrollbar]:hidden [&>button:last-of-type]:border-b-0"
                  ref={ref}
                  role="region"
                  style={LIST_STYLE}
                  // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- The scroll region must support keyboard scrolling, including when every row is disabled.
                  tabIndex={0}
                >
                  {ranked.map((row, index) => (
                    <ProviderRow
                      key={row.family.family}
                      onOpen={openFamily}
                      onTrack={trackEngine}
                      rank={index + 1}
                      row={row}
                      trackEngine={trackableEngines.get(row.family.family)}
                      trackingDisabled={addEngine.isPending}
                      tracking={pendingFamily === row.family.family}
                    />
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className={cn(
                    "from-card pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t to-transparent transition-opacity duration-200 motion-reduce:transition-none",
                    atEnd ? "opacity-0" : "opacity-100"
                  )}
                  style={{ height: `${GEO_MENTION_FADE_HEIGHT_REM}rem` }}
                />
              </div>
            </div>
          </div>
        )}
        <EngineFamilySheet
          aliases={settings?.aliases}
          companyName={settings?.companyName}
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
      </InstrumentModule>
    </div>
  );
}
