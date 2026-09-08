"use client";

import {
  calcGeoScanSize,
  geoScanSizeSeverity,
} from "@notra/geo-core/utils/geo-scan";

import { useGeoModelCatalog } from "@/lib/hooks/use-geo";
import { useGeoSequencesDb } from "@/lib/hooks/use-geo-db";
import type { GeoScanEstimateInput } from "@/types/geo-scan-size";

export function useGeoScanEstimate({
  organizationId,
  promptCount,
  engines,
  languages,
}: GeoScanEstimateInput) {
  const { data: catalog } = useGeoModelCatalog(organizationId);
  const { sequences, isLoading: sequencesLoading } =
    useGeoSequencesDb(organizationId);

  if (!catalog || sequencesLoading || promptCount === undefined) {
    return { scanSize: null, warningSeverity: null };
  }

  const scanSize = calcGeoScanSize({
    promptCount,
    engines,
    languages,
    catalog,
    sequences,
  });
  const severity = geoScanSizeSeverity(scanSize);
  const warningSeverity = severity === "ok" ? null : severity;

  return { scanSize, warningSeverity };
}
