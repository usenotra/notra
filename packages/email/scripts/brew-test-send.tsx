/**
 * Sends every email type with its preview data through Brew, to check the
 * published automations end to end.
 *
 *   bun run brew:test-send -- --to you@example.com
 */
import type { ReactElement } from "react";

import { AiCreditsDepletedEmail } from "../src/emails/ai-credits-depleted";
import { ContactMessageEmail } from "../src/emails/contact";
import { DailySummaryEmail } from "../src/emails/daily-summary";
import { FeedbackEmail } from "../src/emails/feedback";
import { ScheduledContentCreatedEmail } from "../src/emails/schedule-content-created";
import { ScheduledContentFailedEmail } from "../src/emails/schedule-content-failed";
import { ScheduledContentSkippedEmail } from "../src/emails/schedule-content-skipped";
import { WelcomeEmail } from "../src/emails/welcome";
import { WorkflowPausedEmail } from "../src/emails/workflow-paused";
import type { BrewEmailCategory } from "../src/types/brew";
import { isBrewConfigured, sendBrewEmail } from "../src/utils/brew";

// Every template falls back to sample data for omitted props.
const SAMPLES: Record<BrewEmailCategory, [string, ReactElement]> = {
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
    "Your Notra workflow was paused",
    WorkflowPausedEmail({} as never),
  ],
  "schedule-content-created": [
    "Your Weekly Product Updates schedule created new content",
    ScheduledContentCreatedEmail({} as never),
  ],
  "schedule-content-failed": [
    "Your Weekly Product Updates schedule failed to generate content",
    ScheduledContentFailedEmail({} as never),
  ],
  "schedule-content-skipped": [
    "Your Weekly Product Updates schedule skipped content generation",
    ScheduledContentSkippedEmail({} as never),
  ],
  "daily-summary": [
    DailySummaryEmail.PreviewProps.headline,
    DailySummaryEmail(DailySummaryEmail.PreviewProps),
  ],
};

const toIndex = process.argv.indexOf("--to");
const to = toIndex === -1 ? undefined : process.argv[toIndex + 1];
if (!to) {
  throw new Error("Pass a recipient with --to");
}

// Without a key sendBrewEmail would only print the emails.
if (!isBrewConfigured()) {
  throw new Error("BREW_API_KEY is not set");
}

const runId = Date.now();

for (const [category, [subject, react]] of Object.entries(SAMPLES) as [
  BrewEmailCategory,
  [string, ReactElement],
][]) {
  const result = await sendBrewEmail({
    category,
    to,
    subject: `[Test] ${subject}`,
    react,
    idempotencyKey: `test-send:${category}:${runId}`,
  });

  console.log(
    result.error
      ? `✗ ${category}: ${result.error.name} ${result.error.message}`
      : `✓ ${category}: ${result.data?.id}`
  );
}
