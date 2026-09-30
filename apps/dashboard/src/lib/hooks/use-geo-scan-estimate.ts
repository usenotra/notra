"use client";

import { customPromptScanId } from "@notra/geo-core/geo/prompts";
import type { GeoPromptTranslationsResponse } from "@notra/geo-core/types/geo";
import { calcGeoScanSize } from "@notra/geo-core/utils/geo-scan";

import { useGeoModelCatalog, useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import { useGeoPromptTranslations } from "@/lib/hooks/use-geo-prompt-translations";
import type { GeoScanEstimateInput } from "@/types/geo-scan-size";

/**
 * Prompts each translated language will scan. A single-prompt scan asks a
 * language only when that language picked the prompt.
 */
function translatedPromptCounts(
  translations: GeoPromptTranslationsResponse,
  promptCount: number,
  promptId: string | undefined
): Record<string, number> {
  const scanIds = promptId
    ? new Set([promptId, customPromptScanId(promptId)])
    : null;
  return Object.fromEntries(
    translations.languages.map((plan) => [
      plan.language,
      scanIds
        ? Number(plan.entries.some((entry) => scanIds.has(entry.promptId)))
        : Math.min(plan.entries.length, promptCount),
    ])
  );
}

export function useGeoScanEstimate({
  organizationId,
  promptCount,
  engines,
  languages,
  promptId,
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
      ? translatedPromptCounts(translations, promptCount, promptId)
      : undefined,
    trackWithoutSearch: settingsData?.settings?.trackWithoutSearch ?? false,
    catalog,
    sequences: includeSequences ? sequences : [],
  });
  return { scanSize };
}
