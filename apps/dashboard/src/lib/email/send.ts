import { createHash } from "node:crypto";

import { AiCreditsDepletedEmail } from "@notra/email/emails/ai-credits-depleted";
import { DailySummaryEmail } from "@notra/email/emails/daily-summary";
import { FeedbackEmail } from "@notra/email/emails/feedback";
import { ScheduledContentCreatedEmail } from "@notra/email/emails/schedule-content-created";
import { ScheduledContentFailedEmail } from "@notra/email/emails/schedule-content-failed";
import { ScheduledContentSkippedEmail } from "@notra/email/emails/schedule-content-skipped";
import { WelcomeEmail } from "@notra/email/emails/welcome";
import { WorkflowPausedEmail } from "@notra/email/emails/workflow-paused";
import { EMAIL_CONFIG } from "@notra/email/utils/config";
import { FEEDBACK_SENTIMENT_META } from "@notra/email/utils/feedback";
import type { Resend } from "resend";

import type {
  SendAiCreditsDepletedEmailProps,
  SendDailySummaryEmailProps,
  SendFeedbackEmailProps,
  SendScheduledContentCreatedEmailProps,
  SendScheduledContentFailedEmailProps,
  SendScheduledContentSkippedEmailProps,
  SendWorkflowPausedEmailProps,
} from "@/types/email/send";
import { sendEmailWithRetry } from "@/utils/email/send-with-retry";

// --- Send Functions ---

export async function sendWelcomeEmail(
  resend: Resend,
  {
    userEmail,
  }: {
    userEmail: string;
  }
) {
  return sendEmailWithRetry(
    resend,
    {
      from: "Dominik from Notra <dominik@hello.usenotra.com>",
      replyTo: "dominik@usenotra.com",
      to: userEmail,
      subject: "Welcome to Notra",
      react: WelcomeEmail(),
      tags: [{ name: "category", value: "welcome" }],
    },
    `notra:welcome:${userEmail}`
  );
}

export async function sendScheduledContentFailedEmail(
  resend: Resend,
  {
    recipientEmail,
    organizationName,
    scheduleName,
    reason,
    organizationSlug,
    subject,
  }: SendScheduledContentFailedEmailProps
) {
  const settingsLink = `${process.env.APP_URL ?? "https://app.usenotra.com"}/${organizationSlug}/schedules`;

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
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
      tags: [{ name: "category", value: "schedule-content-failed" }],
    },
    `notra:schedule-content-failed:${recipientEmail}:${scheduleName}:${Date.now()}`
  );
}

export async function sendScheduledContentSkippedEmail(
  resend: Resend,
  {
    recipientEmail,
    organizationName,
    scheduleName,
    reason,
    organizationSlug,
    subject,
  }: SendScheduledContentSkippedEmailProps
) {
  const settingsLink = `${process.env.APP_URL ?? "https://app.usenotra.com"}/${organizationSlug}/schedules`;

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
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
      tags: [{ name: "category", value: "schedule-content-skipped" }],
    },
    `notra:schedule-content-skipped:${recipientEmail}:${scheduleName}:${Date.now()}`
  );
}

export async function sendAiCreditsDepletedEmail(
  resend: Resend,
  {
    recipientEmail,
    organizationName,
    automationName,
    organizationSlug,
    limitLabel,
    subject,
  }: SendAiCreditsDepletedEmailProps
) {
  const appUrl = process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl();
  const creditsLink = limitLabel
    ? `${appUrl}/${organizationSlug}/settings/billing`
    : `${appUrl}/${organizationSlug}/settings/credits`;
  const defaultSubject = limitLabel
    ? "Your Notra plan limit was reached"
    : "Your Notra AI credits are depleted";
  const idempotencyKey = createHash("sha256")
    .update(
      `${recipientEmail}:${organizationSlug}:${automationName}:${Date.now()}`
    )
    .digest("hex")
    .slice(0, 32);

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
      to: recipientEmail,
      subject: subject ?? defaultSubject,
      react: AiCreditsDepletedEmail({
        organizationName,
        organizationSlug,
        automationName,
        creditsLink,
        limitLabel,
      }),
      tags: [{ name: "category", value: "ai-credits-depleted" }],
    },
    idempotencyKey
  );
}

export async function sendWorkflowPausedEmail(
  resend: Resend,
  {
    recipientEmail,
    organizationName,
    automationName,
    organizationSlug,
    reason,
    pauseEventId,
    subject,
  }: SendWorkflowPausedEmailProps
) {
  const appUrl = process.env.APP_URL ?? EMAIL_CONFIG.getAppUrl();
  const settingsLink = `${appUrl}/${organizationSlug}/automation/schedules`;
  const idempotencyKey = createHash("sha256")
    .update(
      `${recipientEmail}:${organizationSlug}:${automationName}:${reason}:${pauseEventId ?? Date.now()}`
    )
    .digest("hex")
    .slice(0, 32);

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
      to: recipientEmail,
      subject: subject ?? "Your Notra workflow was paused",
      react: WorkflowPausedEmail({
        organizationName,
        organizationSlug,
        automationName,
        reason,
        settingsLink,
      }),
      tags: [{ name: "category", value: "workflow-paused" }],
    },
    idempotencyKey
  );
}

export async function sendFeedbackEmail(
  resend: Resend,
  {
    to,
    message,
    sentiment,
    userName,
    userEmail,
    organizationName,
    organizationSlug,
    pageUrl,
    userAgent,
  }: SendFeedbackEmailProps
) {
  const idempotencyKey = createHash("sha256")
    .update(`${userEmail}:${message}:${sentiment ?? ""}:${Date.now()}`)
    .digest("hex")
    .slice(0, 32);

  const subjectPrefix = sentiment
    ? `${FEEDBACK_SENTIMENT_META[sentiment].emoji} `
    : "";

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: userEmail,
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
      tags: [{ name: "category", value: "feedback" }],
    },
    `notra:feedback:${idempotencyKey}`
  );
}

export async function sendScheduledContentCreatedEmail(
  resend: Resend,
  {
    recipientEmail,
    organizationName,
    scheduleName,
    createdContent,
    contentType,
    contentOverviewLink,
    organizationSlug,
    subject,
  }: SendScheduledContentCreatedEmailProps
) {
  const rawIdempotencySuffix = createdContent
    .map((item) => item.contentLink)
    .join(",");
  const idempotencySuffix = createHash("sha256")
    .update(rawIdempotencySuffix)
    .digest("hex")
    .slice(0, 32);

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
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
      tags: [{ name: "category", value: "schedule-content-created" }],
    },
    `notra:schedule-content-created:${recipientEmail}:${idempotencySuffix}`
  );
}

export async function sendDailySummaryEmail(
  resend: Resend,
  {
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
    netChange,
    items,
    remainingCount,
    dashboardLink,
    dateKey,
  }: SendDailySummaryEmailProps
) {
  const idempotencyKey = createHash("sha256")
    .update(`${recipientEmail}:${organizationSlug}:${dateKey}`)
    .digest("hex")
    .slice(0, 32);

  return sendEmailWithRetry(
    resend,
    {
      from: EMAIL_CONFIG.from,
      replyTo: EMAIL_CONFIG.replyTo,
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
        netChange,
        items,
        remainingCount,
        dashboardLink,
      }),
      tags: [{ name: "category", value: "daily-summary" }],
    },
    `notra:daily-summary:${idempotencyKey}`
  );
}
