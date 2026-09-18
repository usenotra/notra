"use client";

import {
  calcGeoScanSize,
  geoScanSizeSeverity,
} from "@notra/geo-core/utils/geo-scan";

import { useGeoModelCatalog, useGeoSettings } from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import type { GeoScanEstimateInput } from "@/types/geo-scan-size";

export function useGeoScanEstimate({
  organizationId,
  promptCount,
  engines,
  languages,
  includeSequences = true,
}: GeoScanEstimateInput) {
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const { data: settingsData } = useGeoSettings(organizationId);
  const { sequences, isLoading: sequencesLoading } =
    useGeoSequencesDb(organizationId);

  if (
    !catalog ||
    (includeSequences && sequencesLoading) ||
    promptCount === undefined
  ) {
    return { scanSize: null, warningSeverity: null };
  }

  const scanSize = calcGeoScanSize({
    promptCount,
    engines,
    languages,
    trackWithoutSearch: settingsData?.settings?.trackWithoutSearch ?? false,
    catalog,
    sequences: includeSequences ? sequences : [],
  });
  const severity = geoScanSizeSeverity(scanSize);
  const warningSeverity = severity === "ok" ? null : severity;

  return { scanSize, warningSeverity };
}
