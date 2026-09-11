"use client";

import { GEO_DEFAULT_TAB, GEO_TAB_VALUES } from "@notra/geo-core/constants/geo";
import type { GeoTab } from "@notra/geo-core/types/geo";
import { POSTHOG_EVENTS } from "@notra/posthog/events";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useReducedMotion } from "motion/react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";

import { useOrganizationsContext } from "@/components/providers/organization-provider";
import { GEO_MODULES_REVEAL_MS } from "@/constants/geo-overview";
import { trackEvent } from "@/lib/analytics/posthog-client";
import {
  useGeoCompetitorShare,
  useGeoCompetitors,
  useGeoLanguageShare,
  useGeoOverview,
  useGeoPromptResults,
  useGeoPrompts,
  useGeoSettings,
  useGeoStartScan,
  useGeoTimeseries,
  useGeoTrafficJourneys,
  useIsGeoScanning,
} from "@/lib/hooks/use-geo";
import { useGeoRange } from "@/lib/hooks/use-geo-range";
import type { GeoOverviewPageModel } from "@/types/geo";
import { resolveOrganizationId } from "@/utils/geo-overview-organization";
import {
  countEnabledGeoPrompts,
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
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(GEO_TAB_VALUES).withDefault(GEO_DEFAULT_TAB)
  );

  const { data: settingsData, isPending: isSettingsPending } =
    useGeoSettings(organizationId);
  const { data: overview } = useGeoOverview(organizationId, geoRange.query);
  const { data: timeseries } = useGeoTimeseries(organizationId, geoRange.query);
  const { data: prompts } = useGeoPrompts(organizationId);
  const { data: promptResults } = useGeoPromptResults(
    organizationId,
    geoRange.query,
    activeTab === "visibility" || activeTab === "prompts"
  );
  const { data: competitorShare } = useGeoCompetitorShare(
    organizationId,
    geoRange.query
  );
  const { data: competitorList } = useGeoCompetitors(organizationId);
  const { data: languageShare } = useGeoLanguageShare(
    organizationId,
    geoRange.query
  );
  const { data: trafficJourneys } = useGeoTrafficJourneys(
    organizationId,
    geoRange.query,
    activeTab === "journeys"
  );
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
    competitors: competitorList?.competitors,
    languagePoints: languageShare?.points,
    promptResults: promptResults?.results,
    promptCount: prompts?.prompts.length,
    journeys: trafficJourneys?.journeys,
    isScanning,
    revealActive,
    scanPreflight: {
      open: preflightOpen,
      onOpenChange: setPreflightOpen,
      onConfirm: (engines) => {
        startScan.mutate(engines ? { engines } : undefined);
        setPreflightOpen(false);
      },
      isPending: startScan.isPending,
      promptCount: countEnabledGeoPrompts(prompts?.prompts),
      lastScanAt: settings.lastScanAt,
    },
  });
}
