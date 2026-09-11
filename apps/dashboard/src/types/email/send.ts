import type { DailySummaryEmailItem } from "@notra/email/types/daily-summary";
import type { FeedbackSentiment } from "@notra/email/types/feedback";
import type { WorkflowPausedReason } from "@notra/email/types/workflow-paused";
import type { Resend } from "resend";

export interface EmailResult {
  data: { id: string } | null;
  error: { name: string; message: string } | null;
}

export interface EmailRetryFailure {
  result: EmailResult;
  retryable: boolean;
}

export type EmailPayload = Parameters<Resend["emails"]["send"]>[0];

export interface SendFeedbackEmailProps {
  to: string;
  message: string;
  sentiment?: FeedbackSentiment;
  userName: string;
  userEmail: string;
  organizationName?: string;
  organizationSlug?: string;
  pageUrl?: string;
  userAgent?: string;
}

export interface SendScheduledContentFailedEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
  scheduleName: string;
  reason: string;
  subject?: string;
}

export interface SendScheduledContentSkippedEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
  scheduleName: string;
  reason: string;
  subject?: string;
}

export interface SendAiCreditsDepletedEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
  automationName: string;
  limitLabel?: string;
  subject?: string;
}

export interface SendWorkflowPausedEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
  automationName: string;
  reason: WorkflowPausedReason;
  pauseEventId?: string;
  subject?: string;
}

export interface ScheduledCreatedContentItem {
  title: string;
  contentLink: string;
}

export interface SendScheduledContentCreatedEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
  scheduleName: string;
  createdContent: ScheduledCreatedContentItem[];
  contentType: string;
  contentOverviewLink: string;
  subject?: string;
}

export interface SendDailySummaryEmailProps {
  recipientEmail: string;
  organizationName: string;
  organizationSlug: string;
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
  dashboardLink: string;
  dateKey: string;
}
