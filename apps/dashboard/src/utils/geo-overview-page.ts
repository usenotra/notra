import { GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES } from "@notra/geo-core/constants/geo";
import type {
  GeoCompetitor,
  GeoCompetitorSharePoint,
  GeoCompetitorShareTimeseriesPoint,
  GeoJourney,
  GeoJourneyStatsResponse,
  GeoLanguageSharePoint,
  GeoOverviewEngine,
  GeoPromptResultSummary,
  GeoSettings,
  GeoTab,
  GeoTimeseriesPoint,
  GeoTrackedPrompt,
} from "@notra/geo-core/types/geo";

import type {
  GeoOverviewPageReady,
  GeoRangeControl,
  ScanPreflightDialogProps,
} from "@/types/geo";

export function countEnabledGeoPrompts(
  prompts: readonly GeoTrackedPrompt[] | undefined
): number | undefined {
  if (!prompts) {
    return undefined;
  }

  return prompts.filter((prompt) => prompt.enabled).length;
}

export function geoOverviewQueriesEnabled(
  organizationId: string,
  isSettingsPending: boolean,
  hasSettings: boolean
): boolean {
  return Boolean(organizationId) && !isSettingsPending && hasSettings;
}

export function geoOverviewTabEnabled(
  queriesEnabled: boolean,
  activeTab: GeoTab,
  tab: GeoTab
): boolean {
  return queriesEnabled && activeTab === tab;
}

export function geoJourneysTabLoading(input: {
  activeTab: GeoTab;
  isJourneysPending: boolean;
  isJourneyStatsPending: boolean;
  isJourneysPlaceholder: boolean;
  isJourneyStatsPlaceholder: boolean;
}): boolean {
  if (input.activeTab !== "journeys") {
    return false;
  }
  return (
    input.isJourneysPending ||
    input.isJourneyStatsPending ||
    input.isJourneysPlaceholder ||
    input.isJourneyStatsPlaceholder
  );
}

export function toGeoOverviewReadyPage(input: {
  organizationId: string;
  organizationSlug: string;
  settings: GeoSettings;
  geoRange: GeoRangeControl;
  activeTab: GeoTab;
  onActiveTabChange: (tab: GeoTab) => void;
  engines: GeoOverviewEngine[] | undefined;
  timeseriesPoints: GeoTimeseriesPoint[] | undefined;
  competitorPoints: GeoCompetitorSharePoint[] | undefined;
  competitorShareTimeseries:
    | readonly GeoCompetitorShareTimeseriesPoint[]
    | undefined;
  competitors: GeoCompetitor[] | undefined;
  languagePoints: GeoLanguageSharePoint[] | undefined;
  promptResults: GeoPromptResultSummary[] | undefined;
  promptCount: number | undefined;
  journeys: GeoJourney[] | undefined;
  journeyStats: GeoJourneyStatsResponse | undefined;
  journeyStatsFailed: boolean;
  journeysLoading: boolean;
  isScanning: boolean;
  revealActive: boolean;
  scanPreflight: Omit<
    ScanPreflightDialogProps,
    "engines" | "languages" | "organizationId"
  >;
}): GeoOverviewPageReady {
  const engines = input.engines ?? [];
  const timeseriesPoints = input.timeseriesPoints ?? [];
  const competitorPoints = input.competitorPoints ?? [];
  const competitorShareTimeseries =
    input.competitorShareTimeseries ?? GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES;
  const competitors = input.competitors ?? [];
  const languagePoints = input.languagePoints ?? [];
  const promptResults = input.promptResults ?? [];
  const journeys = input.journeys ?? [];

  return {
    status: "ready",
    organizationId: input.organizationId,
    organizationSlug: input.organizationSlug,
    companyName: input.settings.companyName,
    geoRange: input.geoRange,
    isScanning: input.isScanning,
    revealActive: input.revealActive,
    onRunScan: () => input.scanPreflight.onOpenChange(true),
    tabs: {
      promptCount: input.promptCount ?? 0,
      activeTab: input.activeTab,
      onActiveTabChange: input.onActiveTabChange,
      organizationSlug: input.organizationSlug,
      revealActive: input.revealActive,
      settings: input.settings,
      engines,
      timeseriesPoints,
      competitorPoints,
      competitorShareTimeseries,
      competitors,
      languagePoints,
      promptResults,
      isScanning: input.isScanning,
      journeys,
      journeyStats: input.journeyStats ?? null,
      journeyStatsFailed: input.journeyStatsFailed,
      journeysLoading: input.journeysLoading,
      organizationId: input.organizationId,
    },
    scanPreflight: {
      ...input.scanPreflight,
      organizationId: input.organizationId,
      engines: input.settings.engines,
      languages: input.settings.languages,
    },
  };
}
