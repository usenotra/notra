import type { geoMentionChecks } from "@notra/db/schema";
import type { GeoScanSuggestionEvidence } from "@notra/db/types/geo-suggestions";

export type ScanSuggestionCheck = Pick<
  typeof geoMentionChecks.$inferSelect,
  | "id"
  | "scanId"
  | "engine"
  | "promptId"
  | "prompt"
  | "answer"
  | "grounding"
  | "capturedAt"
  | "language"
>;

export interface ScanSuggestionCandidate {
  prompt: string;
  evidence: GeoScanSuggestionEvidence[];
  origins: Set<string>;
  engines: Set<string>;
}
