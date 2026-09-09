import type { useGeoScanEstimate } from "@/lib/hooks/use-geo-scan-estimate";

export interface ScanPreflightHeaderProps {
  prompt?: string;
  confirmationOnly: boolean;
  warningSeverity: ReturnType<typeof useGeoScanEstimate>["warningSeverity"];
}

export interface GeoScanEstimateInput {
  organizationId: string;
  promptCount: number | undefined;
  engines: readonly string[];
  languages: readonly string[];
  includeSequences?: boolean;
}
