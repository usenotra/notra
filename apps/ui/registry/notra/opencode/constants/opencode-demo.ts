import type {
  OpencodeDemoActivity,
  OpencodeDemoSession,
  OpencodeSource,
} from "../types/opencode";

export const OPENCODE_DEMO_SESSION: OpencodeDemoSession = {
  activities: [
    {
      body: "Pull merged PRs for the week, group them by area, then draft in the brand voice.",
      duration: "1.4s",
      id: "prepare",
      kind: "thought",
      label: "Preparing changelog workflow",
    },
    {
      body: "14 merged PRs, 2 releases",
      detail: "range=week",
      id: "events",
      kind: "tool",
      label: "notra_list_events",
    },
    {
      body: "live at acme.com/changelog",
      detail: "type=changelog",
      id: "publish",
      kind: "tool",
      label: "notra_publish_post",
    },
  ],
  assistantMessage:
    "I'll pull the week's merged work, draft the changelog in your voice, and publish it.",
  context: "26.2K (7%)",
  cwd: "~/acme/web",
  promptPlaceholder: 'Ask anything... "Draft a launch post"',
  resultMessage: "Published. Drafted in your voice from 14 PRs in 22 seconds.",
  servers: [
    { name: "notra", status: "Connected" },
    { name: "github", status: "Connected" },
    { name: "linear", status: "Connected" },
  ],
  title: "OpenCode — ~/acme/web",
  tokens: "26,167 tokens",
  used: "7% used",
  userMessage: "draft a changelog from this week's merged PRs and post it",
  version: "1.18.25",
};

export const OPENCODE_DEMO_SOURCES: OpencodeSource[] = [
  { domain: "chatgpt.com", title: "ChatGPT", url: "https://chatgpt.com/" },
  { domain: "claude.ai", title: "Claude", url: "https://claude.ai/" },
  { domain: "jasper.ai", title: "Jasper", url: "https://www.jasper.ai/" },
  { domain: "canva.com", title: "Canva", url: "https://www.canva.com/" },
  { domain: "adobe.com", title: "Adobe", url: "https://www.adobe.com/" },
  {
    domain: "descript.com",
    title: "Descript",
    url: "https://www.descript.com/",
  },
  {
    domain: "support.google.com",
    title: "Gemini",
    url: "https://support.google.com/",
  },
];

export const OPENCODE_DEMO_QUERIES: string[] = [
  "best AI writing tools 2026",
  "AI changelog generators",
];

export const OPENCODE_DEMO_ACTIVITIES: OpencodeDemoActivity[] = [
  {
    body: "Load the brand voice, then draft from the merged PRs.",
    duration: "1.4s",
    id: "thought",
    kind: "thought",
    label: "Preparing executor for changelog workflow",
  },
  {
    body: '"Scheduler v2, 40% faster builds"',
    detail: "type=changelog, voice=brand",
    id: "tool",
    kind: "tool",
    label: "notra_create_post",
  },
];
