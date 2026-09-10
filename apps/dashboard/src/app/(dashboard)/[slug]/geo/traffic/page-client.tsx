"use client";

import { GEO_TRAFFIC_REVEAL_MS } from "@notra/geo-core/constants/geo";
import { isTrafficPagePending } from "@notra/geo-core/utils/ai-traffic";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateTablePreview } from "@/components/empty-state-preview";
import { AiTrafficCard } from "@/components/geo/ai-traffic-card";
import { AiTrafficLogCard } from "@/components/geo/ai-traffic-log-card";
import { GeoRangePicker } from "@/components/geo/geo-range-picker";
import { GeoSetupButton } from "@/components/geo/geo-setup-button";
import { TrafficEmpty } from "@/components/geo/traffic-empty";
import { TrafficPagesCard } from "@/components/geo/traffic-pages-card";
import { InstrumentReveal } from "@/components/instrument/instrument-reveal";
import { PageContainer } from "@/components/layout/container";
import {
  GeoProjectProvider,
  useGeoProjectScope,
} from "@/components/providers/geo-project-provider";
import { useOrganizationsContext } from "@/components/providers/organization-provider";
import {
  EMPTY_STATE_TABLE_COLUMNS,
  EMPTY_STATE_TABLE_ROWS,
} from "@/constants/empty-state";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useAiTraffic,
  useGeoIngestSetup,
  useGeoSettings,
  useGeoTrafficPages,
} from "@/lib/hooks/use-geo";
import { useGeoProjectQueryState } from "@/lib/hooks/use-geo-project-query";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import type { GeoPageClientProps } from "@/types/geo";
import { withGeoProject } from "@/utils/geo-paths";
import { geoSettingsPath } from "@/utils/settings-path";

import { GeoTrafficSkeleton } from "./skeleton";

export default function PageClient({ organizationSlug }: GeoPageClientProps) {
  const [projectParam] = useGeoProjectQueryState();

  return (
    <GeoProjectProvider projectId={projectParam ?? undefined}>
      <TrafficPageContent organizationSlug={organizationSlug} />
    </GeoProjectProvider>
  );
}

function TrafficPageContent({ organizationSlug }: GeoPageClientProps) {
  const { projectId } = useGeoProjectScope();
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const orgFromList = getOrganization(organizationSlug);
  const organization =
    activeOrganization?.slug === organizationSlug
      ? activeOrganization
      : orgFromList;
  const organizationId = organization?.id ?? "";

  const geoRange = useGeoRange();
  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const { data: traffic, isPending: isTrafficPending } = useAiTraffic(
    organizationId,
    geoRange.query
  );
  const { data: ingestSetup, isPending: isIngestPending } =
    useGeoIngestSetup(organizationId);
  const { data: trafficPages, isPending: isPagesPending } = useGeoTrafficPages(
    organizationId,
    geoRange.query
  );

  const settings = settingsData?.settings ?? null;
  const sources = traffic?.sources ?? [];
  const isEmptyTraffic = !isTrafficPending && sources.length === 0;
  const showSkeleton = isTrafficPagePending({
    isSettingsPending,
    hasSettings: settings !== null,
    isTrafficPending,
    isEmptyTraffic,
    isIngestPending,
  });

  const reduceMotion = useReducedMotion();
  const [modulesVisible, setModulesVisible] = useState(false);
  const ready = !showSkeleton;
  const revealActive = ready && (Boolean(reduceMotion) || modulesVisible);

  useEffect(() => {
    if (!(ready && !reduceMotion)) {
      return;
    }
    const timer = setTimeout(
      () => setModulesVisible(true),
      GEO_TRAFFIC_REVEAL_MS
    );
    return () => clearTimeout(timer);
  }, [ready, reduceMotion]);

  const viewedRef = useRef(false);
  const hasSettings = settings !== null;
  const rangePreset = geoRange.preset;

  useEffect(() => {
    if (viewedRef.current || !ready) {
      return;
    }
    viewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.TRAFFIC_VIEWED, {
      has_traffic: hasSettings && !isEmptyTraffic,
      has_settings: hasSettings,
      range: rangePreset,
    });
  }, [hasSettings, isEmptyTraffic, rangePreset, ready]);

  if (showSkeleton) {
    return <GeoTrafficSkeleton />;
  }

  if (!settings) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="w-full space-y-6 px-4 lg:px-6">
          <header className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">AI Traffic</h1>
            <p className="text-muted-foreground text-sm">
              AI crawlers and referrals visiting your site
            </p>
          </header>
          <EmptyState
            action={<GeoSetupButton organizationId={organizationId} />}
            description="Set up GEO tracking first, then watch AI crawlers and referrals as they arrive."
            preview={
              <EmptyStateTablePreview
                columns={EMPTY_STATE_TABLE_COLUMNS.traffic}
                rows={EMPTY_STATE_TABLE_ROWS}
              />
            }
            title="Not set up yet"
          />
        </div>
      </PageContainer>
    );
  }

  const header = (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">AI Traffic</h1>
        <p className="text-muted-foreground text-sm">
          AI crawlers and referrals visiting your site
        </p>
      </div>
      <GeoRangePicker control={geoRange} />
    </header>
  );

  if (isEmptyTraffic) {
    return (
      <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex w-full flex-col gap-6 px-4 lg:px-6">
          {header}
          <InstrumentReveal active={revealActive} order={0}>
            <TrafficEmpty setup={ingestSetup} />
          </InstrumentReveal>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="w-full space-y-6 px-4 lg:px-6">
        {header}
        <div className="flex flex-col gap-6">
          <InstrumentReveal active={revealActive} order={0}>
            <AiTrafficCard
              settingsHref={withGeoProject(
                geoSettingsPath(organizationSlug),
                projectId
              )}
              traffic={traffic}
            />
          </InstrumentReveal>
          <InstrumentReveal active={revealActive} order={1}>
            <TrafficPagesCard
              isPending={isPagesPending}
              pages={trafficPages?.pages ?? []}
            />
          </InstrumentReveal>
          <InstrumentReveal active={revealActive} order={2}>
            <AiTrafficLogCard organizationId={organizationId} />
          </InstrumentReveal>
        </div>
      </div>
    </PageContainer>
  );
}
