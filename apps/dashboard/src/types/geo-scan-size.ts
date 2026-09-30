export interface GeoScanEstimateInput {
  organizationId: string;
  promptCount: number | undefined;
  engines: readonly string[];
  languages: readonly string[];
  /** A single-prompt scan: counts only languages that picked this prompt. */
  promptId?: string;
  includeSequences?: boolean;
}
