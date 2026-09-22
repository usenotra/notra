"use client";

import type { GeoTab } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { GEO_MODULES_REVEAL_MS } from "@/constants/geo-overview";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoCompetitorShare,
  useGeoLanguageShare,
  useGeoOverview,
  useGeoPromptResults,
  useGeoSettings,
  useGeoStartScan,
  useGeoTimeseries,
  useGeoJourneyStats,
  useGeoTrafficJourneys,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoCompetitorsDb, useGeoPromptsDb } from "@/lib/hooks/use-geo-db";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import { useGeoTab } from "@/lib/hooks/use-geo-tab";
import type { GeoOverviewPageModel } from "@/types/geo";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import {
  countEnabledGeoPrompts,
  geoJourneysTabLoading,
  geoOverviewQueriesEnabled,
  geoOverviewTabEnabled,
  toGeoOverviewReadyPage,
} from "@/utils/geo-overview-page";

function useGeoModulesReveal(ready: boolean): boolean {
  const reduceMotion = useReducedMotion();
  const [modulesVisible, setModulesVisible] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (reduceMotion) {
      return;
    }
    const timer = setTimeout(
      () => setModulesVisible(true),
      GEO_MODULES_REVEAL_MS
    );
    return () => clearTimeout(timer);
  }, [ready, reduceMotion]);

  if (!ready) {
    return false;
  }

  return Boolean(reduceMotion) || modulesVisible;
}

function useGeoOverviewViewed(input: {
  ready: boolean;
  hasSettings: boolean;
  overviewLoaded: boolean;
  engineCount: number;
  rangePreset: string;
  activeTab: GeoTab;
}) {
  const overviewViewedRef = useRef(false);

  useEffect(() => {
    if (overviewViewedRef.current) {
      return;
    }
    if (!input.ready) {
      return;
    }
    if (input.hasSettings && !input.overviewLoaded) {
      return;
    }
    overviewViewedRef.current = true;
    trackEvent(POSTHOG_EVENTS.GEO_OVERVIEW_VIEWED, {
      has_data: input.engineCount > 0,
      has_settings: input.hasSettings,
      range: input.rangePreset,
      tab: input.activeTab,
    });
  }, [
    input.activeTab,
    input.engineCount,
    input.hasSettings,
    input.overviewLoaded,
    input.rangePreset,
    input.ready,
  ]);
}

export function useGeoOverviewPage(
  organizationSlug: string
): GeoOverviewPageModel {
  const { getOrganization, activeOrganization } = useOrganizationsContext();
  const organizationId = resolveOrganizationId(
    organizationSlug,
    activeOrganization,
    getOrganization(organizationSlug)
  );
  const geoRange = useGeoRange();
  const { activeTab, setActiveTab } = useGeoTab();

  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const hasSettings = Boolean(settingsData?.settings);
  const queriesEnabled = geoOverviewQueriesEnabled(
    organizationId,
    isSettingsPending,
    hasSettings
  );
  const visibilityEnabled = geoOverviewTabEnabled(
    queriesEnabled,
    activeTab,
    "visibility"
  );
  const journeysEnabled = geoOverviewTabEnabled(
    queriesEnabled,
    activeTab,
    "journeys"
  );
  const { data: overview } = useGeoOverview(
    organizationId,
    geoRange.query,
    queriesEnabled
  );
  const { data: timeseries } = useGeoTimeseries(
    organizationId,
    geoRange.query,
    queriesEnabled
  );
  const { prompts, isLoading: isPromptsLoading } = useGeoPromptsDb(
    organizationId,
    { enabled: queriesEnabled }
  );
  const { data: promptResults } = useGeoPromptResults(
    organizationId,
    geoRange.query,
    visibilityEnabled
  );
  const { data: competitorShare } = useGeoCompetitorShare(
    organizationId,
    geoRange.query,
    false,
    visibilityEnabled
  );
  const { competitors } = useGeoCompetitorsDb(organizationId, {
    enabled: queriesEnabled,
  });
  const { data: languageShare } = useGeoLanguageShare(
    organizationId,
    geoRange.query,
    visibilityEnabled
  );
  const {
    data: trafficJourneys,
    isPending: isJourneysPending,
    isPlaceholderData: isJourneysPlaceholder,
  } = useGeoTrafficJourneys(organizationId, geoRange.query, journeysEnabled);
  const {
    data: journeyStats,
    isPending: isJourneyStatsPending,
    isPlaceholderData: isJourneyStatsPlaceholder,
    isError: isJourneyStatsError,
  } = useGeoJourneyStats(organizationId, geoRange.query, journeysEnabled);
  const startScan = useGeoStartScan(organizationId);
  const isScanning = useIsGeoScanning(organizationId);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const settings = settingsData?.settings ?? null;
  const ready = !isSettingsPending;
  const revealActive = useGeoModulesReveal(ready);

  useHotkey("R", () => setPreflightOpen(true), {
    enabled: !isScanning && !preflightOpen,
  });

  useGeoOverviewViewed({
    ready,
    hasSettings: Boolean(settings),
    overviewLoaded: overview !== undefined,
    engineCount: overview?.engines.length ?? 0,
    rangePreset: geoRange.preset,
    activeTab,
  });

  if (isSettingsPending) {
    return { status: "loading" };
  }

  if (!settings) {
    return { status: "empty", organizationId };
  }

  return toGeoOverviewReadyPage({
    organizationId,
    organizationSlug,
    settings,
    geoRange,
    activeTab,
    onActiveTabChange: setActiveTab,
    engines: overview?.engines,
    timeseriesPoints: timeseries?.points,
    competitorPoints: competitorShare?.points,
    competitorShareTimeseries: competitorShare?.timeseries,
    competitors,
    languagePoints: languageShare?.points,
    promptResults: promptResults?.results,
    promptCount: prompts.length,
    journeys: trafficJourneys?.journeys,
    journeyStats,
    journeyStatsFailed: isJourneyStatsError && journeyStats === undefined,
    journeysLoading: geoJourneysTabLoading({
      activeTab,
      isJourneysPending,
      isJourneyStatsPending,
      isJourneysPlaceholder,
      isJourneyStatsPlaceholder,
    }),
    isScanning,
    revealActive,
    scanPreflight: {
      open: preflightOpen,
      onOpenChange: setPreflightOpen,
      onConfirm: (engines) => {
        // Await the promise instead of passing onSuccess to mutate: observer
        // callbacks never run if this page unmounts first, the promise does.
        void (async () => {
          try {
            await startScan.mutateAsync(engines ? { engines } : undefined);
            toast.success(
              "Scan started. It runs in the background. You can leave this page."
            );
          } catch {
            // The mutation reports the error itself.
          }
        })();
        setPreflightOpen(false);
      },
      isPending: startScan.isPending,
      promptCount: countEnabledGeoPrompts(
        isPromptsLoading ? undefined : prompts
      ),
      lastScanAt: settings.lastScanAt,
    },
  });
}
