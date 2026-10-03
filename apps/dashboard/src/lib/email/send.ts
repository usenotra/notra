import { AiCreditsDepletedEmail } from "@notra/email/emails/ai-credits-depleted";
import { DailySummaryEmail } from "@notra/email/emails/daily-summary";
import { FeedbackEmail } from "@notra/email/emails/feedback";
import { ScheduledContentCreatedEmail } from "@notra/email/emails/schedule-content-created";
import { ScheduledContentFailedEmail } from "@notra/email/emails/schedule-content-failed";
import { ScheduledContentSkippedEmail } from "@notra/email/emails/schedule-content-skipped";
import { WelcomeEmail } from "@notra/email/emails/welcome";
import { WorkflowPausedEmail } from "@notra/email/emails/workflow-paused";
import { sendBrewEmail } from "@notra/email/utils/brew";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { FEEDBACK_SENTIMENT_META } from "@notra/email/utils/feedback";

import type {
  SendAiCreditsDepletedEmailProps,
  SendDailySummaryEmailProps,
  SendFeedbackEmailProps,
  SendScheduledContentCreatedEmailProps,
  SendScheduledContentFailedEmailProps,
  SendScheduledContentSkippedEmailProps,
  SendWorkflowPausedEmailProps,
} from "@/types/email/send";

// --- Send Functions ---

export async function sendWelcomeEmail({ userEmail }: { userEmail: string }) {
  return sendBrewEmail({
    category: "welcome",
    to: userEmail,
    subject: "Welcome to Notra",
    react: WelcomeEmail(),
    idempotencyKey: userEmail,
  });
}

export async function sendScheduledContentFailedEmail({
  recipientEmail,
  organizationName,
  scheduleName,
  reason,
  organizationSlug,
  subject,
}: SendScheduledContentFailedEmailProps) {
  const settingsLink = `${process.env.APP_URL ?? "https://app.usenotra.com"}/${organizationSlug}/schedules`;

  return sendBrewEmail({
    category: "schedule-content-failed",
    to: recipientEmail,
    subject:
      subject ?? `Your ${scheduleName} schedule failed to generate content`,
    react: ScheduledContentFailedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      reason,
      settingsLink,
    }),
    idempotencyKey: `${recipientEmail}:${scheduleName}:${Date.now()}`,
  });
}

export async function sendScheduledContentSkippedEmail({
  recipientEmail,
  organizationName,
  scheduleName,
  reason,
  organizationSlug,
  subject,
}: SendScheduledContentSkippedEmailProps) {
  const settingsLink = `${process.env.APP_URL ?? "https://app.usenotra.com"}/${organizationSlug}/schedules`;

  return sendBrewEmail({
    category: "schedule-content-skipped",
    to: recipientEmail,
    subject:
      subject ?? `Your ${scheduleName} schedule skipped content generation`,
    react: ScheduledContentSkippedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      reason,
      settingsLink,
    }),
    idempotencyKey: `${recipientEmail}:${scheduleName}:${Date.now()}`,
  });
}

export async function sendAiCreditsDepletedEmail({
  recipientEmail,
  organizationName,
  automationName,
  organizationSlug,
  limitLabel,
  subject,
}: SendAiCreditsDepletedEmailProps) {
  const appUrl = process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl();
  const creditsLink = limitLabel
    ? `${appUrl}/${organizationSlug}/settings/billing`
    : `${appUrl}/${organizationSlug}/settings/credits`;
  const defaultSubject = limitLabel
    ? "Your Notra plan limit was reached"
    : "Your Notra AI credits are depleted";
  return sendBrewEmail({
    category: "ai-credits-depleted",
    to: recipientEmail,
    subject: subject ?? defaultSubject,
    react: AiCreditsDepletedEmail({
      organizationName,
      organizationSlug,
      automationName,
      creditsLink,
      limitLabel,
    }),
    idempotencyKey: `${recipientEmail}:${organizationSlug}:${automationName}:${Date.now()}`,
  });
}

export async function sendWorkflowPausedEmail({
  recipientEmail,
  organizationName,
  automationName,
  organizationSlug,
  reason,
  pauseEventId,
  subject,
}: SendWorkflowPausedEmailProps) {
  const appUrl = process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl();
  const settingsLink = `${appUrl}/${organizationSlug}/automation/schedules`;
  return sendBrewEmail({
    category: "workflow-paused",
    to: recipientEmail,
    subject: subject ?? "Your Notra workflow was paused",
    react: WorkflowPausedEmail({
      organizationName,
      organizationSlug,
      automationName,
      reason,
      settingsLink,
    }),
    idempotencyKey: `${recipientEmail}:${organizationSlug}:${automationName}:${reason}:${pauseEventId ?? Date.now()}`,
  });
}

export async function sendFeedbackEmail({
  to,
  message,
  sentiment,
  userName,
  userEmail,
  organizationName,
  organizationSlug,
  pageUrl,
  userAgent,
}: SendFeedbackEmailProps) {
  const subjectPrefix = sentiment
    ? `${FEEDBACK_SENTIMENT_META[sentiment].emoji} `
    : "";

  return sendBrewEmail({
    category: "feedback",
    to,
    subject: `${subjectPrefix}New feedback from ${userName}`,
    react: FeedbackEmail({
      message,
      sentiment,
      userName,
      userEmail,
      organizationName,
      organizationSlug,
      pageUrl,
      userAgent,
    }),
    idempotencyKey: `${userEmail}:${message}:${sentiment ?? ""}:${Date.now()}`,
  });
}

export async function sendScheduledContentCreatedEmail({
  recipientEmail,
  organizationName,
  scheduleName,
  createdContent,
  contentType,
  contentOverviewLink,
  organizationSlug,
  subject,
}: SendScheduledContentCreatedEmailProps) {
  return sendBrewEmail({
    category: "schedule-content-created",
    to: recipientEmail,
    subject: subject ?? `Your ${scheduleName} schedule created new content`,
    react: ScheduledContentCreatedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      createdContent,
      contentType,
      contentOverviewLink,
    }),
    idempotencyKey: `${recipientEmail}:${createdContent.map((item) => item.contentLink).join(",")}`,
  });
}

export async function sendDailySummaryEmail({
  recipientEmail,
  organizationName,
  organizationSlug,
  dateLabel,
  headline,
  mentionRateLabel,
  mentionRateDeltaLabel,
  scansCompleted,
  gained,
  lost,
  items,
  remainingCount,
  dashboardLink,
  dateKey,
}: SendDailySummaryEmailProps) {
  return sendBrewEmail({
    category: "daily-summary",
    to: recipientEmail,
    subject: headline,
    react: DailySummaryEmail({
      organizationName,
      organizationSlug,
      dateLabel,
      headline,
      mentionRateLabel,
      mentionRateDeltaLabel,
      scansCompleted,
      gained,
      lost,
      items,
      remainingCount,
      dashboardLink,
    }),
    idempotencyKey: `${recipientEmail}:${organizationSlug}:${dateKey}`,
  });
}
