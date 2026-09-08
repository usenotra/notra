export interface GeoScanEstimateInput {
  organizationId: string;
  promptCount: number | undefined;
  engines: readonly string[];
  languages: readonly string[];
}
