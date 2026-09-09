"use client";

import { GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES } from "@notra/geo-core/constants/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import {
  PermissionOption,
  PermissionRow,
} from "@notra/ui/components/ui/permission-selector";
import type { ReactNode } from "react";

import { BrandSentimentCard } from "@/components/geo/brand-sentiment-card";
import { EngineRateTable } from "@/components/geo/engine-rate-table";
import { JourneyOverviewCard } from "@/components/geo/journey-overview-card";
import { JourneyPathsCard } from "@/components/geo/journey-paths-card";
import { JourneysCard } from "@/components/geo/journeys-card";
import { LanguagePerformanceCard } from "@/components/geo/language-performance-card";
import { MentionRateCard } from "@/components/geo/mention-rate-card";
import { MentionTrendCard } from "@/components/geo/mention-trend-card";
import { ShareOfVoiceCard } from "@/components/geo/share-of-voice-card";
import { WhatChangedCard } from "@/components/geo/what-changed-card";
import { InstrumentGrid } from "@/components/instrument/instrument-grid";
import { InstrumentReveal } from "@/components/instrument/instrument-reveal";
import { trackEvent } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";
import type { GeoTabsProps } from "@/types/geo";
import { toGeoTab } from "@/utils/geo-tabs";

function TriggerCount({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span className="text-xs tabular-nums opacity-70">
      {count.toLocaleString()}
    </span>
  );
}

function TabSection({
  active,
  order,
  children,
  className,
}: {
  active: boolean;
  order: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <InstrumentReveal
      active={active}
      className={cn("h-full", className)}
      order={order}
    >
      {children}
    </InstrumentReveal>
  );
}

export function GeoTabs({
  activeTab,
  onActiveTabChange,
  organizationSlug,
  revealActive,
  settings,
  engines,
  timeseriesPoints,
  competitorPoints,
  competitorShareTimeseries = GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES,
  competitors,
  languagePoints,
  promptResults,
  isScanning,
  journeys,
  organizationId,
}: GeoTabsProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <PermissionRow
        className="w-fit shrink-0"
        label="GEO sections"
        layout="compact"
        onValueChange={(value) => {
          const tab = toGeoTab(value);
          trackEvent(POSTHOG_EVENTS.GEO_TAB_CHANGED, { tab });
          onActiveTabChange(tab);
        }}
        value={activeTab}
      >
        <PermissionOption value="visibility">Visibility</PermissionOption>
        <PermissionOption value="sentiment">Brand Sentiment</PermissionOption>
        <PermissionOption value="journeys">
          <span className="flex items-baseline gap-1.5">
            Journeys
            <TriggerCount count={journeys.length} />
          </span>
        </PermissionOption>
      </PermissionRow>

      {activeTab === "visibility" ? (
        <div className="mt-6 flex flex-col gap-6 overflow-visible">
          <InstrumentGrid className="grid-cols-1 items-stretch gap-4 overflow-visible lg:grid-cols-12">
            <TabSection
              active={revealActive}
              className="relative z-20 overflow-visible lg:col-span-5"
              order={0}
            >
              <MentionRateCard
                competitors={competitors}
                engines={engines}
                isScanning={isScanning}
                organizationSlug={organizationSlug}
                promptResults={promptResults}
                settings={settings}
                timeseriesPoints={timeseriesPoints}
                trackedEngines={settings.engines}
              />
            </TabSection>
            <TabSection
              active={revealActive}
              className="lg:col-span-7"
              order={1}
            >
              <MentionTrendCard
                isScanning={isScanning}
                points={timeseriesPoints}
              />
            </TabSection>
          </InstrumentGrid>
          <TabSection active={revealActive} order={2}>
            <WhatChangedCard
              competitors={competitors}
              isScanning={isScanning}
              organizationId={organizationId}
              organizationSlug={organizationSlug}
              promptResults={promptResults}
            />
          </TabSection>
          <TabSection active={revealActive} order={3}>
            <EngineRateTable
              aliases={settings.aliases}
              companyName={settings.companyName}
              competitors={competitors}
              engines={engines}
              isScanning={isScanning}
              organizationSlug={organizationSlug}
              promptResults={promptResults}
              timeseriesPoints={timeseriesPoints}
            />
          </TabSection>
          <InstrumentGrid className="grid-cols-1 gap-4 lg:grid-cols-2">
            <TabSection active={revealActive} order={4}>
              <ShareOfVoiceCard
                aliases={settings.aliases}
                companyName={settings.companyName}
                competitors={competitors}
                isScanning={isScanning}
                organizationId={organizationId}
                organizationSlug={organizationSlug}
                points={competitorPoints}
                timeseries={competitorShareTimeseries}
              />
            </TabSection>
            <TabSection active={revealActive} order={5}>
              <LanguagePerformanceCard
                isScanning={isScanning}
                organizationId={organizationId}
                points={languagePoints}
                settings={settings}
              />
            </TabSection>
          </InstrumentGrid>
        </div>
      ) : null}

      {activeTab === "sentiment" ? (
        <div className="mt-6 w-full max-w-lg">
          <TabSection active={revealActive} order={0}>
            <BrandSentimentCard
              organizationId={organizationId}
              isScanning={isScanning}
            />
          </TabSection>
        </div>
      ) : null}

      {activeTab === "journeys" ? (
        <div className="mt-6 flex flex-col gap-6">
          <InstrumentGrid className="grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <TabSection
              active={revealActive}
              className="lg:col-span-5"
              order={0}
            >
              <JourneyOverviewCard journeys={journeys} />
            </TabSection>
            <TabSection
              active={revealActive}
              className="lg:col-span-7"
              order={1}
            >
              <JourneyPathsCard journeys={journeys} />
            </TabSection>
          </InstrumentGrid>
          <TabSection active={revealActive} order={2}>
            <JourneysCard journeys={journeys} organizationId={organizationId} />
          </TabSection>
        </div>
      ) : null}
    </div>
  );
}
