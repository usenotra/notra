import { AiCreditsDepletedEmail } from "@notra/email/emails/ai-credits-depleted";
import { DailySummaryEmail } from "@notra/email/emails/daily-summary";
import { FeedbackEmail } from "@notra/email/emails/feedback";
import { ScheduledContentCreatedEmail } from "@notra/email/emails/schedule-content-created";
import { ScheduledContentFailedEmail } from "@notra/email/emails/schedule-content-failed";
import { ScheduledContentSkippedEmail } from "@notra/email/emails/schedule-content-skipped";
import { ScheduledPublicationFailedEmail } from "@notra/email/emails/scheduled-publication-failed";
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
  SendScheduledPublicationFailedEmailProps,
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
  digestBatchKey,
  recipientEmail,
  organizationName,
  scheduleName,
  reason,
  organizationSlug,
  subject,
}: SendScheduledContentFailedEmailProps) {
  const settingsLink = `${process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/automation/schedules`;

  return sendBrewEmail({
    category: "schedule-content-failed",
    to: recipientEmail,
    subject: subject ?? `${scheduleName} couldn't generate content`,
    react: ScheduledContentFailedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      reason,
      settingsLink,
    }),
    idempotencyKey: digestBatchKey,
  });
}

export async function sendScheduledPublicationFailedEmail({
  recipientEmail,
  failureKey,
  ...props
}: SendScheduledPublicationFailedEmailProps) {
  // Shares the scheduled-content failure trigger: same audience and setting.
  return sendBrewEmail({
    category: "schedule-content-failed",
    to: recipientEmail,
    subject: `"${props.postTitle}" could not be published`,
    react: ScheduledPublicationFailedEmail(props),
    // One email per failure and recipient, however often the step retries.
    idempotencyKey: `scheduled-publication:${failureKey}:${recipientEmail}`,
  });
}

export async function sendScheduledContentSkippedEmail({
  digestBatchKey,
  recipientEmail,
  organizationName,
  scheduleName,
  reason,
  organizationSlug,
  subject,
}: SendScheduledContentSkippedEmailProps) {
  const settingsLink = `${process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl()}/${organizationSlug}/automation/schedules`;

  return sendBrewEmail({
    category: "schedule-content-skipped",
    to: recipientEmail,
    subject: subject ?? `${scheduleName} skipped a run`,
    react: ScheduledContentSkippedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      reason,
      settingsLink,
    }),
    idempotencyKey: digestBatchKey,
  });
}

export async function sendAiCreditsDepletedEmail({
  digestBatchKey,
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
    idempotencyKey: digestBatchKey,
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
    subject: subject ?? `${automationName} was paused`,
    react: WorkflowPausedEmail({
      organizationName,
      organizationSlug,
      automationName,
      reason,
      settingsLink,
    }),
    idempotencyKey: `${recipientEmail}:${pauseEventId}`,
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
    // Everything the email shows: the same feedback from the same page within
    // Brew's 24 h window is a double submit, anything else a new message.
    idempotencyKey: JSON.stringify([
      to,
      userName,
      userEmail,
      organizationName,
      organizationSlug,
      pageUrl,
      userAgent,
      sentiment,
      message,
    ]),
  });
}

export async function sendScheduledContentCreatedEmail({
  digestBatchKey,
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
    subject: subject ?? `New content from ${scheduleName}`,
    react: ScheduledContentCreatedEmail({
      organizationName,
      organizationSlug,
      scheduleName,
      createdContent,
      contentType,
      contentOverviewLink,
    }),
    idempotencyKey: digestBatchKey,
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
    // The headline goes in the preview text; long subjects get truncated.
    subject: `GEO recap for ${organizationName}, ${dateLabel}`,
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
