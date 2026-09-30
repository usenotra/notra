"use client";

import { calcGeoScanSize } from "@notra/geo-core/utils/geo-scan";

import { useGeoModelCatalog, useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import { useGeoPromptTranslations } from "@/lib/hooks/use-geo-prompt-translations";
import type { GeoScanEstimateInput } from "@/types/geo-scan-size";

export function useGeoScanEstimate({
  organizationId,
  promptCount,
  engines,
  languages,
  includeSequences = true,
}: GeoScanEstimateInput) {
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const { data: settingsData, isLoading: settingsLoading } =
    useGeoSettings(organizationId);
  const { sequences, isLoading: sequencesLoading } =
    useGeoSequencesDb(organizationId);
  const { data: translations } = useGeoPromptTranslations(organizationId);

  if (
    !catalog ||
    settingsLoading ||
    (includeSequences && sequencesLoading) ||
    promptCount === undefined
  ) {
    return { scanSize: null };
  }

  const scanSize = calcGeoScanSize({
    promptCount,
    engines,
    languages,
    promptLanguage: settingsData?.settings?.promptLanguage,
    translatedPromptCounts: translations
      ? Object.fromEntries(
          translations.languages.map((plan) => [
            plan.language,
            Math.min(plan.entries.length, promptCount),
          ])
        )
      : undefined,
    trackWithoutSearch: settingsData?.settings?.trackWithoutSearch ?? false,
    catalog,
    sequences: includeSequences ? sequences : [],
  });
  return { scanSize };
}
