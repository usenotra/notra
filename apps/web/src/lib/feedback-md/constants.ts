import type { ClaudeCodeTodo } from "@notra/ui/components/ai-skins/claude-code/claude-code-todo-list";

import { DatabuddyLogo } from "@/components/landing/marquee-logos/databuddy-logo";
import type {
  FeedbackMdAdopter,
  FeedbackMdClient,
  FeedbackMdPrinciple,
  FeedbackMdQuestion,
  FeedbackMdSection,
  FeedbackMdSibling,
  FeedbackMdTerminalHeader,
  FeedbackMdTerminalToolCall,
} from "@/types/feedback-md";
import { NOTRA_SUPPORT_EMAIL } from "@/utils/agent-metadata";
import { DOCS_URL, SITE_URL } from "@/utils/urls";

export const FEEDBACK_MD_PATH = "/feedback.md";

export const FEEDBACK_MD_PAGE_PATH = "/feedback-md";

const FEEDBACK_MD_URL = `${SITE_URL}${FEEDBACK_MD_PATH}`;

export const FEEDBACK_MD_DOCS_URL = `${DOCS_URL}/api/agent-feedback`;

export const FEEDBACK_MD_TITLE = "feedback.md";

export const FEEDBACK_MD_DESCRIPTION =
  "feedback.md is a Markdown file at the root of your site. It tells an agent where to send feedback about your product, your MCP server, your docs and whatever page it is reading right now.";

export const FEEDBACK_MD_HERO_LEAD =
  "You already talk to your users. Their agents hit dead ends and find bugs nobody reports, then quietly move on. feedback.md gives them a place to say so.";

export const FEEDBACK_MD_CLIENTS: FeedbackMdClient[] = [
  {
    id: "curl",
    label: "curl",
    invertInDark: false,
    command: `curl -s ${FEEDBACK_MD_URL}`,
  },
  {
    id: "claude-code",
    label: "Claude Code",
    iconSrc: "/mcp/claude-code.svg",
    invertInDark: false,
    command: `claude "read ${FEEDBACK_MD_URL} and send feedback about the last tool call that failed"`,
  },
  {
    id: "codex",
    label: "Codex",
    iconSrc: "/mcp/codex.svg",
    invertInDark: true,
    command: `codex "read ${FEEDBACK_MD_URL} and send feedback about the last tool call that failed"`,
  },
];

export const FEEDBACK_MD_EXAMPLE_DISCLAIMER =
  "Fall and usefall.com are made up for this example. The URLs do not resolve.";

export const FEEDBACK_MD_TEMPLATE = `# Fall Feedback

Fall wants to hear from the agents using it. If a tool call failed or a page was hard to read, send it here instead of moving on. Praise is welcome too.

## Where to send it

- MCP: call \`submit_feedback\` on https://mcp.usefall.com/mcp
- HTTP: POST https://api.usefall.com/v1/feedback with \`Authorization: Bearer <token>\`
- Fallback: agents@usefall.com

## What we want to hear about

- The product: https://usefall.com
- The MCP server: https://mcp.usefall.com/mcp
- The API: https://api.usefall.com (spec at /openapi.json)
- The docs: https://docs.usefall.com
- This page: whatever URL you are reading right now

## What to include

- What you were trying to do and what happened instead
- The URL, tool name or endpoint involved
- Your client and model, if you are allowed to share them

## What happens next

Feedback lands in the Fall team's inbox and is triaged within a week. We do not reply to agents. Fixes show up at https://usefall.com/changelog.
`;

export const FEEDBACK_MD_TERMINAL_TITLE = "claude — ~/storefront";

export const FEEDBACK_MD_TERMINAL_HEADER: FeedbackMdTerminalHeader = {
  version: "v2.1.285",
  model: "Opus 5.5 (1M context)",
  org: "Claude Max",
  cwd: "~/storefront",
  tips: [
    "feedback.md discovered on usefall.com",
    "Failed tool calls can be reported without stopping the task",
  ],
  whatsNew: ["Sites with a `/feedback.md` accept bug reports from agents."],
};

export const FEEDBACK_MD_TERMINAL_USER_MESSAGE =
  "add Fall checkout to the pricing page and test a $49 charge";

export const FEEDBACK_MD_TERMINAL_ASSISTANT_MESSAGE =
  "`create_checkout` rejected the request. Checking where Fall wants feedback before I retry.";

export const FEEDBACK_MD_TERMINAL_TODOS: ClaudeCodeTodo[] = [
  { label: "Install @usefall/checkout and add the keys", status: "done" },
  { label: "Wire the pricing page to create_checkout", status: "done" },
  { label: "Report the failed charge via feedback.md", status: "active" },
  { label: "Retry with the amount in cents", status: "todo" },
];

export const FEEDBACK_MD_TERMINAL_TOOL_CALLS: FeedbackMdTerminalToolCall[] = [
  {
    tool: "fall - create_checkout (MCP)",
    arg: "amount: 49",
    result: "422 amount must be an integer in cents, docs say dollars",
    status: "error",
  },
  {
    tool: "Fetch",
    arg: "usefall.com/feedback.md",
    result: "3 channels, MCP preferred",
    status: "success",
  },
  {
    tool: "fall - submit_feedback (MCP)",
    arg: 'kind: "bug"',
    result: "202 accepted · fb_x8k2q · docs and API disagree on amount units",
    status: "success",
  },
];

export const FEEDBACK_MD_TERMINAL_RESULT_MESSAGE =
  "Filed the docs mismatch with the exact request that failed and moved on. Retrying with `amount: 4900`.";

export const FEEDBACK_MD_TERMINAL_TURN_SUMMARY = {
  verb: "Worked",
  duration: "31s",
  doneAt: "4:12 PM",
};

export const FEEDBACK_MD_TERMINAL_PROMPT_PLACEHOLDER =
  'Try "send feedback about the last tool call that failed"';

export const FEEDBACK_MD_PRINCIPLES: FeedbackMdPrinciple[] = [
  {
    title: "A file, not a protocol",
    description:
      "Plain Markdown at /feedback.md. No handshake and no schema to validate against. If an agent can read llms.txt it can read this.",
  },
  {
    title: "Where, not how",
    description:
      "auth.md explains how to sign in. feedback.md only says where feedback goes and what to put in it. Bring your own endpoint, MCP tool or inbox.",
  },
  {
    title: "Scoped to what the agent touched",
    description:
      "One line each for the product, the MCP server, the docs and the current page, so a report about a broken tool reaches whoever owns that tool.",
  },
];

export const FEEDBACK_MD_SECTIONS: FeedbackMdSection[] = [
  {
    heading: "Where to send it",
    required: true,
    description:
      "The one section every file needs. Channels in order of preference: an MCP tool, an HTTP endpoint or just an email address. Link to auth.md if the channel needs a credential.",
  },
  {
    heading: "What we want to hear about",
    required: false,
    description:
      "The surfaces an agent might be using. Listing them tells the agent that a broken MCP tool and a confusing docs page both belong here, and so does the page it is reading right now.",
  },
  {
    heading: "What to include",
    required: false,
    description:
      "Shapes the report without a schema. What the agent tried, what happened and the URL or tool involved is enough for a human to act on.",
  },
  {
    heading: "What happens next",
    required: false,
    description:
      "Sets expectations. Say who reads it and roughly when. Tell the agent not to wait for a reply.",
  },
];

export const FEEDBACK_MD_SIBLINGS: FeedbackMdSibling[] = [
  {
    file: "llms.txt",
    answers: "What should I read?",
    direction: "site to agent",
    href: "https://llmstxt.org",
  },
  {
    file: "auth.md",
    answers: "How do I sign in?",
    direction: "site to agent",
    href: "https://workos.com/auth-md",
  },
  {
    file: "design.md",
    answers: "How should it look?",
    direction: "site to agent",
    href: "/design.md",
  },
  {
    file: "feedback.md",
    answers: "Where do I say what went wrong?",
    direction: "agent to site",
    href: FEEDBACK_MD_PATH,
  },
];

export const FEEDBACK_MD_ADOPTERS: FeedbackMdAdopter[] = [
  {
    name: "databuddy",
    label: "Databuddy",
    siteUrl: "https://www.databuddy.cc",
    feedbackUrl: "https://www.databuddy.cc/feedback.md",
    Logo: DatabuddyLogo,
  },
];

export const FEEDBACK_MD_ADOPTERS_CAPTION = "Adopted by";

export const FEEDBACK_MD_ADOPTERS_DESCRIPTION =
  "Teams already serving a feedback.md at their root. Each one links to the live file.";

export const FEEDBACK_MD_ADOPTERS_CTA_LABEL = "This could be you";

export const FEEDBACK_MD_ADOPTERS_CTA_HREF = `mailto:${NOTRA_SUPPORT_EMAIL}?subject=${encodeURIComponent("We adopted feedback.md")}`;

const FEEDBACK_MD_PAGE_URL = `${SITE_URL}${FEEDBACK_MD_PAGE_PATH}`;

export const FEEDBACK_MD_SETUP_PROMPT = `Read ${FEEDBACK_MD_PAGE_URL} and add a feedback.md to this site at /feedback.md, following the template on that page. Before you write it, ask me for the URL or address where agent feedback should go. Serve the file as text/markdown. Then add it to the site's llms.txt so agents can find it, creating llms.txt if it does not exist yet.`;

export const FEEDBACK_MD_QUESTIONS: FeedbackMdQuestion[] = [
  {
    id: "standard",
    question: "Is this a standard?",
    answer:
      "No. It is a convention we use and think other teams should copy, in the same spirit as llms.txt and auth.md. If enough people pick it up we will write it down properly. Until then the whole spec is the template above.",
  },
  {
    id: "well-known",
    question: "Why the root and not /.well-known?",
    answer:
      "llms.txt, auth.md and design.md all live at the root and agents already look there. Markdown under .well-known is unusual, and a file a person can open in a browser is the point. Serving a copy at /.well-known/feedback.md costs nothing if you want both.",
  },
  {
    id: "discovery",
    question: "How do agents find it?",
    answer:
      "The same way they find everything else on your site. Link it from llms.txt, add it to your agent card or api-catalog under .well-known and mention it in auth.md. Agents follow links they are given. They do not go looking for file names.",
  },
  {
    id: "no-endpoint",
    question: "What if I do not have a feedback endpoint?",
    answer:
      "An email address or a link to your issue tracker is a valid channel. The file gives agents an address. It does not ask you to run infrastructure. You can upgrade the channel later without changing anything an agent has already learned.",
  },
  {
    id: "need-notra",
    question: "Do I need Notra for this?",
    answer:
      "No. Notra is one place the feedback can land, with a write-only token, an MCP helper and an inbox that sorts what comes in. The file itself works with anything.",
  },
];

export const FEEDBACK_MD_UPSELL_HEADING =
  "Give the feedback somewhere to land.";

export const FEEDBACK_MD_UPSELL_SUBCOPY =
  "Notra is the backend on the other end of the file. Agents post to it over HTTP or MCP, and your team reads it in one inbox.";

export const FEEDBACK_MD_UPSELL_PRIMARY_LABEL =
  "Start collecting agent feedback";

export const FEEDBACK_MD_UPSELL_SECONDARY_LABEL = "Read the API docs";

export const FEEDBACK_MD_UPSELL_SIGNUP_SOURCE = "feedback_md_upsell";
