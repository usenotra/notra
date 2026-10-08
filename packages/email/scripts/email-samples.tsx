/** One sample per email type, shared by the Brew test-send and preview scripts. */
import type { ReactElement } from "react";

import { AiCreditsDepletedEmail } from "../src/emails/ai-credits-depleted";
import { ContactMessageEmail } from "../src/emails/contact";
import { FeedbackEmail } from "../src/emails/feedback";
import { ScheduledContentCreatedEmail } from "../src/emails/schedule-content-created";
import { ScheduledContentFailedEmail } from "../src/emails/schedule-content-failed";
import { ScheduledContentSkippedEmail } from "../src/emails/schedule-content-skipped";
import { WeeklySummaryEmail } from "../src/emails/weekly-summary";
import { WelcomeEmail } from "../src/emails/welcome";
import { WorkflowPausedEmail } from "../src/emails/workflow-paused";
import type { BrewEmailCategory } from "../src/types/brew";

// Every template falls back to sample data for omitted props.
export const EMAIL_SAMPLES: Record<BrewEmailCategory, [string, ReactElement]> =
  {
    welcome: ["Welcome to Notra", WelcomeEmail()],
    feedback: ["🙂 New feedback from Jane Doe", FeedbackEmail({} as never)],
    contact: [
      "New contact message from Jane Doe",
      ContactMessageEmail({} as never),
    ],
    "ai-credits-depleted": [
      "Your Notra AI credits are depleted",
      AiCreditsDepletedEmail({} as never),
    ],
    "workflow-paused": [
      "Weekly Product Updates was paused",
      WorkflowPausedEmail({} as never),
    ],
    "schedule-content-created": [
      "New content from Weekly Product Updates",
      ScheduledContentCreatedEmail({} as never),
    ],
    "schedule-content-failed": [
      "Weekly Product Updates couldn't generate content",
      ScheduledContentFailedEmail({} as never),
    ],
    "schedule-content-skipped": [
      "Weekly Product Updates skipped a run",
      ScheduledContentSkippedEmail({} as never),
    ],
    "daily-summary": [
      `Weekly GEO recap for ${WeeklySummaryEmail.PreviewProps.organizationName}, ${WeeklySummaryEmail.PreviewProps.weekLabel}`,
      WeeklySummaryEmail(WeeklySummaryEmail.PreviewProps),
    ],
  };

/** Names used for the Brew triggers, automations and preview designs. */
export const EMAIL_LABELS: Record<BrewEmailCategory, string> = {
  welcome: "Welcome",
  feedback: "Product feedback",
  contact: "Contact form message",
  "ai-credits-depleted": "AI credits depleted",
  "workflow-paused": "Workflow paused",
  "schedule-content-created": "Scheduled content created",
  "schedule-content-failed": "Scheduled content failed",
  "schedule-content-skipped": "Scheduled content skipped",
  "daily-summary": "Daily GEO summary",
};
