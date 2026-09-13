import type { DailySummaryEmailItem } from "@notra/email/types/daily-summary";
import type { GeoChangesSummary } from "@notra/geo-core/types/geo";

export interface DailySummaryWindow {
  start: Date;
  end: Date;
}

export type DailySummaryOrganizationResult =
  | "quiet"
  | { emailsSent: number; failed: boolean };

export interface DailySummaryMentionTotals {
  checks: number;
  mentions: number;
  rate: number | null;
}

export interface DailySummaryUnchangedInput {
  yesterday: DailySummaryMentionTotals;
  previousDay: DailySummaryMentionTotals;
  changes: GeoChangesSummary;
  hasNewEngine: boolean;
}

export interface BuiltDailySummary {
  dateLabel: string;
  headline: string;
  mentionRateLabel: string;
  mentionRateDeltaLabel: string;
  scansCompleted: number;
  gained: number;
  lost: number;
  netChange: number;
  items: DailySummaryEmailItem[];
  remainingCount: number;
}

export interface BuildDailySummaryInput {
  windowStart: Date;
  scansCompleted: number;
  yesterday: DailySummaryMentionTotals;
  previousDay: DailySummaryMentionTotals;
  changes: GeoChangesSummary;
  items: DailySummaryEmailItem[];
  remainingCount: number;
}
