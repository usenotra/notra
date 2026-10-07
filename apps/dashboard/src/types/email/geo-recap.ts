import type { GeoCheckPeriodInput } from "@notra/db/types/geo-checks";

export type GeoRecapWindow = Omit<GeoCheckPeriodInput, "organizationId">;

export interface GeoRecapPeriodStats {
  checks: number;
  mentions: number;
  avgPosition: number | null;
}

/** One tracked prompt on one engine, with enough answers in both periods. */
export interface GeoRecapPair {
  key: string;
  projectId: string;
  promptId: string;
  engine: string;
  prompt: string;
  previous: GeoRecapPeriodStats;
  current: GeoRecapPeriodStats;
}

export type GeoRecapChangeKind = "gained" | "lost" | "rank_up" | "rank_down";

export interface GeoRecapPairChange {
  pair: GeoRecapPair;
  kind: GeoRecapChangeKind;
}

export interface GeoRecapRate {
  checks: number;
  /** Mean of per-pair mention rates; null without comparable pairs. */
  rate: number | null;
}

export interface GeoRecapCompetitorShare {
  brand: string;
  previous: number;
  current: number;
}

export type GeoRecapOrganizationResult =
  | "quiet"
  | { emailsSent: number; failed: boolean };

export interface GeoRecapCronResult {
  kind: "weekly" | "drop_alert";
  windowStart: string;
  windowEnd: string;
  organizationsConsidered: number;
  emailsSent: number;
  skippedQuiet: number;
  failed: number;
}
