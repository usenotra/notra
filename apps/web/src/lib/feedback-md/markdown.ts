import {
  FEEDBACK_MD_ADOPTERS,
  FEEDBACK_MD_ADOPTERS_CTA_LABEL,
  FEEDBACK_MD_ADOPTERS_DESCRIPTION,
  FEEDBACK_MD_DESCRIPTION,
  FEEDBACK_MD_EXAMPLE_DISCLAIMER,
  FEEDBACK_MD_HERO_LEAD,
  FEEDBACK_MD_PAGE_PATH,
  FEEDBACK_MD_PATH,
  FEEDBACK_MD_PRINCIPLES,
  FEEDBACK_MD_QUESTIONS,
  FEEDBACK_MD_SECTIONS,
  FEEDBACK_MD_SIBLINGS,
  FEEDBACK_MD_SETUP_PROMPT,
  FEEDBACK_MD_TEMPLATE,
  FEEDBACK_MD_UPSELL_HEADING,
  FEEDBACK_MD_UPSELL_SUBCOPY,
} from "@/lib/feedback-md/constants";
import { NOTRA_SUPPORT_EMAIL } from "@/utils/agent-metadata";
import { markdownSection } from "@/utils/markdown";
import { SOCIAL_LINKS } from "@/utils/social-links";
import { API_URL, APP_URL, DOCS_URL, MCP_URL, SITE_URL } from "@/utils/urls";

const NOTRA_CHANGELOG_URL = `${SITE_URL}/changelog/notra`;
const NOTRA_FEEDBACK_ENDPOINT = `${API_URL}/v1/feedback/notra`;

const NOTRA_FEEDBACK_CURL = [
  `curl -X POST ${NOTRA_FEEDBACK_ENDPOINT} \\`,
  '  -H "Content-Type: application/json" \\',
  "  -d '{",
  '    "message": "The search tool times out when the query has quotes.",',
  '    "contextUrl": "https://docs.usenotra.com/search"',
  "  }'",
].join("\n");

export function buildNotraFeedbackMarkdown() {
  return [
    "# Notra Feedback",
    "",
    "Notra wants to hear from the agents using it. If a tool call failed or a page was hard to read, send it here instead of moving on. Praise is welcome too.",
    "",
    markdownSection("Where to send it", [
      `- HTTP: POST ${NOTRA_FEEDBACK_ENDPOINT} with a JSON body. No auth needed.`,
      `- Email: ${NOTRA_SUPPORT_EMAIL}`,
      `- Discord: ${SOCIAL_LINKS.discord}`,
      "",
      "```bash",
      NOTRA_FEEDBACK_CURL,
      "```",
      "",
      `Request body reference: ${DOCS_URL}/api/agent-feedback`,
    ]),
    markdownSection("What we want to hear about", [
      `- The product: ${APP_URL}`,
      `- The MCP server: ${MCP_URL}`,
      `- The API: ${API_URL} (spec at ${API_URL}/openapi.json)`,
      `- The docs: ${DOCS_URL}`,
      `- This site: any page on ${SITE_URL}, including its Markdown twin (append .md to the path)`,
    ]),
    markdownSection("What to include", [
      "- What you were trying to do and what happened instead",
      "- The URL, tool name or endpoint involved",
      "- Your client and model, if you are allowed to share them",
      "",
      "Fields: `message` (required), `title`, `kind` (bug, feature, praise, question, other), `sentiment`, `contextUrl`, `agentClient`, `agentModel`, `idempotencyKey`.",
    ]),
    markdownSection("What happens next", [
      "Feedback lands in the Notra team's inbox, gets classified and is triaged within a week. We do not reply to agents.",
      `Fixes show up at ${NOTRA_CHANGELOG_URL}.`,
      "",
      `About this file: ${SITE_URL}${FEEDBACK_MD_PAGE_PATH}`,
    ]),
  ].join("\n");
}

export function buildFeedbackMdPageMarkdown() {
  const principles = FEEDBACK_MD_PRINCIPLES.flatMap((principle) => [
    `### ${principle.title}`,
    principle.description,
    "",
  ]);
  const sections = FEEDBACK_MD_SECTIONS.map(
    (section) =>
      `- ${section.heading}${section.required ? " (required)" : ""}: ${section.description}`
  );
  const siblings = FEEDBACK_MD_SIBLINGS.map(
    (sibling) => `- ${sibling.file}: ${sibling.answers} (${sibling.direction})`
  );
  const adopters = FEEDBACK_MD_ADOPTERS.map(
    (adopter) => `- ${adopter.label}: ${adopter.feedbackUrl}`
  );
  const questions = FEEDBACK_MD_QUESTIONS.flatMap((item) => [
    `### ${item.question}`,
    item.answer,
    "",
  ]);

  return [
    "# feedback.md",
    "",
    FEEDBACK_MD_HERO_LEAD,
    "",
    FEEDBACK_MD_DESCRIPTION,
    "",
    `Notra's own file: ${SITE_URL}${FEEDBACK_MD_PATH}`,
    "",
    markdownSection("Adopted by", [
      FEEDBACK_MD_ADOPTERS_DESCRIPTION,
      "",
      ...adopters,
      "",
      `${FEEDBACK_MD_ADOPTERS_CTA_LABEL}: serve your own feedback.md and email ${NOTRA_SUPPORT_EMAIL}.`,
    ]),
    markdownSection("What it is", principles),
    markdownSection("Template", [
      "```markdown",
      FEEDBACK_MD_TEMPLATE,
      "```",
      "",
      FEEDBACK_MD_EXAMPLE_DISCLAIMER,
    ]),
    markdownSection("Sections", sections),
    markdownSection("Where it sits", siblings),
    markdownSection("Add it to your site", [
      "Paste this into your agent:",
      "",
      "```",
      FEEDBACK_MD_SETUP_PROMPT,
      "```",
    ]),
    markdownSection("FAQ", questions),
    markdownSection(FEEDBACK_MD_UPSELL_HEADING, [
      FEEDBACK_MD_UPSELL_SUBCOPY,
      "",
      `Docs: ${DOCS_URL}/api/agent-feedback`,
      `Sign up: ${APP_URL}/signup`,
    ]),
  ].join("\n");
}
