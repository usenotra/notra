import { GEO_EMPTY_COMPETITOR_SHARE_TIMESERIES } from "@notra/geo-core/constants/geo";
import type {
  GeoCompetitor,
  GeoCompetitorSharePoint,
  GeoCompetitorShareTimeseriesPoint,
  GeoJourney,
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
  const promptCount = input.promptCount ?? 0;

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
      promptCount,
      isScanning: input.isScanning,
      journeys,
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
