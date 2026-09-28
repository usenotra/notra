import {
  CONTACT_FORM_ASSURANCE,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_MESSAGE_MIN_LENGTH,
  CONTACT_PURPOSE,
  CONTACT_RECIPIENT,
  CONTACT_RESOURCE_LINKS,
  CONTACT_RESPONSE_TIME,
} from "@/constants/contact";
import { markdownSection } from "@/utils/markdown";
import { SITE_URL } from "@/utils/urls";

export function buildContactMarkdown() {
  const resources = CONTACT_RESOURCE_LINKS.map(
    (resource) =>
      `- [${resource.label}](${new URL(resource.href, SITE_URL).href}): ${resource.description}`
  );

  return [
    "# Contact Notra",
    "",
    `We read every message. Tell us what you're working on and a real human will write back. ${CONTACT_RESPONSE_TIME}`,
    "",
    markdownSection("Email", [
      `[${CONTACT_RECIPIENT}](mailto:${CONTACT_RECIPIENT})`,
      "",
      CONTACT_PURPOSE,
    ]),
    markdownSection("Send us a message", [
      `The contact form at ${SITE_URL}/contact asks for your name, email, company (optional), and a message of ${CONTACT_MESSAGE_MIN_LENGTH} to ${CONTACT_MESSAGE_MAX_LENGTH} characters. It is protected by a bot check, so agents should email instead.`,
      "",
      CONTACT_FORM_ASSURANCE,
    ]),
    markdownSection("Resources", resources),
    markdownSection("Building with the API or an agent?", [
      `- [Agent authentication guide](${SITE_URL}/auth.md)`,
      `- [API catalog](${SITE_URL}/.well-known/api-catalog)`,
      `- [Developer llms.txt](${SITE_URL}/developers/llms.txt)`,
    ]),
  ].join("\n");
}
