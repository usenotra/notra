export type DailySummaryChangeTone = "up" | "down" | "neutral";

export interface DailySummaryEmailItem {
  title: string;
  detail: string;
  tone: DailySummaryChangeTone;
  engineLabel?: string;
  engineIconSrc?: string;
}

export interface DailySummaryEmailProps {
  organizationName: string;
  organizationSlug: string;
  dateLabel: string;
  headline: string;
  mentionRateLabel: string;
  mentionRateDeltaLabel: string;
  scansCompleted: number;
  gained: number;
  lost: number;
  items: DailySummaryEmailItem[];
  remainingCount: number;
  dashboardLink: string;
}
