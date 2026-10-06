/**
 * Sends every email type with its preview data through Brew, to check the
 * published automations end to end.
 *
 *   bun run brew:test-send -- --to you@example.com
 */
import type { ReactElement } from "react";

import type { BrewEmailCategory } from "../src/types/brew";
import { isBrewConfigured, sendBrewEmail } from "../src/utils/brew";

const toIndex = process.argv.indexOf("--to");
const to = toIndex === -1 ? undefined : process.argv[toIndex + 1];
if (!to) {
  throw new Error("Pass a recipient with --to");
}

// Without a key sendBrewEmail would only print the emails.
if (!isBrewConfigured()) {
  throw new Error("BREW_API_KEY is not set");
}

// The .env points at localhost, which no inbox can load the logo or links
// from; the samples read these when imported.
process.env.NEXT_PUBLIC_SITE_URL = "https://usenotra.com";
process.env.NEXT_PUBLIC_APP_URL = "https://app.usenotra.com";
const { EMAIL_SAMPLES } = await import("./email-samples");

const runId = Date.now();

for (const [category, [subject, react]] of Object.entries(EMAIL_SAMPLES) as [
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
