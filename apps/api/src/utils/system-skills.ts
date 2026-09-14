import { publishSystemSkills } from "@notra/ai/skills/registry";
import { createDb } from "@notra/db/drizzle";

import { logError } from "./logging";

function shouldPublishOnBoot(): boolean {
  return process.env.NODE_ENV !== "test" && Boolean(process.env.DATABASE_URL);
}

/**
 * Publishes the code-defined system skills into the shared registry when the
 * API process boots. Fire and forget: requests are served while it runs, and a
 * failure is logged instead of taking the process down. The dashboard cron
 * (`/api/cron/system-skills-sync`) is the fallback.
 */
export function publishSystemSkillsOnBoot(): void {
  if (!shouldPublishOnBoot()) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return;
  }

  void publishSystemSkills(createDb(databaseUrl))
    .then((result) => {
      const changed =
        result.published.length > 0 ||
        result.upgradedRows > 0 ||
        result.backfilledRows > 0;

      if (changed) {
        console.info("System skills published", {
          published: result.published,
          upgradedRows: result.upgradedRows,
          backfilledRows: result.backfilledRows,
        });
      }
    })
    .catch((error) => {
      logError("Failed to publish system skills on boot", error);
    });
}
