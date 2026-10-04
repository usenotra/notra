/**
 * Imports every email, rendered with sample data, into the Brew email group
 * "Notra · Previews", so Brew shows what the app actually sends. The live
 * automations keep using the pass-through design; these are references only
 * and get replaced on every run.
 *
 *   bun run brew:previews
 */
import type { ReactElement } from "react";
import { render } from "react-email";

import type { BrewEmailCategory } from "../src/types/brew";
import { api, BREW_UNSUBSCRIBE_FOOTER, list } from "./brew-api";

const GROUP_NAME = "Notra · Previews";
const TITLE_PREFIX = "Notra · Preview · ";

// Templates build links when rendered, and previews should show production.
process.env.NEXT_PUBLIC_SITE_URL = "https://usenotra.com";
process.env.NEXT_PUBLIC_APP_URL = "https://app.usenotra.com";
const { EMAIL_LABELS, EMAIL_SAMPLES } = await import("./email-samples");

// Old previews go only after every replacement imported, and a failed run
// removes what it imported, so the group always holds exactly one set.
const stale = (
  await list<{ emailId: string; title: string }>("/emails")
).filter((row) => row.title.startsWith(TITLE_PREFIX));

const imported: string[] = [];
try {
  for (const [category, [subject, react]] of Object.entries(EMAIL_SAMPLES) as [
    BrewEmailCategory,
    [string, ReactElement],
  ][]) {
    const html = await render(react);
    // The welcome email goes out through the marketing design with this footer.
    const content =
      category === "welcome"
        ? html.replace("</body>", `${BREW_UNSUBSCRIBE_FOOTER}</body>`)
        : html;

    const { emailId } = await api<{ emailId: string }>(
      "POST",
      "/emails/import",
      {
        format: "html",
        title: `${TITLE_PREFIX}${EMAIL_LABELS[category]}`,
        subjectLine: subject,
        groupName: GROUP_NAME,
        content,
      }
    );
    imported.push(emailId);
    console.log(`Imported preview ${EMAIL_LABELS[category]}`);
  }
} catch (error) {
  for (const emailId of imported) {
    await api("DELETE", `/emails/${emailId}`);
  }
  throw error;
}

for (const email of stale) {
  await api("DELETE", `/emails/${email.emailId}`);
}
