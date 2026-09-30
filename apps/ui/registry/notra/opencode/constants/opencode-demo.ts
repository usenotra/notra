import type {
  OpencodeDemoActivity,
  OpencodeDemoSession,
  OpencodeDemoTurn,
  OpencodeSource,
} from "../types/opencode";

export const OPENCODE_DEMO_SESSION: OpencodeDemoSession = {
  agent: "Build",
  branch: "feat/changelog-week-39",
  context: "41.2K (4%)",
  cwd: "~/acme/web",
  effort: "high",
  model: "Sonnet 5",
  provider: "Anthropic",
  servers: [
    { name: "notra", status: "Connected" },
    { name: "github", status: "Connected" },
    { name: "linear", status: "Connected" },
    { name: "vercel", status: "Disconnected" },
  ],
  spent: "$0.18 spent",
  title: "Weekly changelog draft",
  tokens: "41,207 tokens",
  used: "4% used",
  version: "1.18.33",
};

export const OPENCODE_DEMO_TURNS: OpencodeDemoTurn[] = [
  {
    activities: [{ duration: "1.1s", id: "t1-thought", kind: "thought" }],
    duration: "4.2s",
    id: "greeting",
    prompt: "is the notra mcp connected?",
    reply: [
      {
        id: "greeting-reply",
        text: [
          "Yes. ",
          { code: "notra" },
          " is connected, so I can read this week's events and publish posts.",
        ],
      },
    ],
  },
  {
    activities: [
      { duration: "1.4s", id: "t2-thought", kind: "thought" },
      { detail: "CHANGELOG.md", id: "t2-read-changelog", kind: "read" },
      { detail: "brand-voice.md", id: "t2-read-voice", kind: "read" },
      {
        detail: "[range=week]",
        id: "t2-events",
        kind: "tool",
        label: "notra_list_events",
      },
      { duration: "2.0s", id: "t2-thought-2", kind: "thought" },
    ],
    duration: "17.8s",
    id: "changelog",
    prompt: "draft this week's changelog from the merged PRs",
    reply: [
      {
        id: "changelog-intro",
        text: [
          "Drafted ",
          { strong: "Acme v2.4" },
          " from 14 merged PRs, grouped by area and written in your brand voice.",
        ],
      },
      { heading: "Features:", id: "changelog-features" },
      {
        id: "changelog-feature-list",
        items: [
          {
            id: "scheduler",
            spans: [
              { code: "apps/scheduler" },
              " - Scheduled posts now publish on every plan",
            ],
          },
          {
            id: "geo",
            spans: [
              { code: "apps/geo" },
              " - Share-of-voice chart per AI engine",
            ],
          },
          {
            id: "api",
            spans: [
              { code: "apps/api" },
              ", ",
              { code: "packages/sdk" },
              " - Webhooks for published posts",
            ],
          },
        ],
      },
      { heading: "Fixes:", id: "changelog-fixes" },
      {
        id: "changelog-fix-list",
        items: [
          {
            id: "editor",
            spans: [
              { code: "apps/editor" },
              " - Image uploads no longer drop alt text",
            ],
          },
          {
            id: "billing",
            spans: [
              { code: "packages/billing" },
              " - Seat counts update right after an invite",
            ],
          },
        ],
      },
      {
        id: "changelog-next",
        text: [
          "Saved as a draft in Notra. Run ",
          { code: "notra_publish_post" },
          " when you're ready to ship it.",
        ],
      },
    ],
  },
];

export const OPENCODE_DEMO_ACTIVITIES: OpencodeDemoActivity[] = [
  {
    body: "The user wants the week's changes. Read the brand voice first, then pull merged PRs from Notra.",
    duration: "1.4s",
    id: "thought",
    kind: "thought",
  },
  { detail: "CHANGELOG.md", id: "read-changelog", kind: "read" },
  { detail: "brand-voice.md", id: "read-voice", kind: "read" },
  {
    body: "14 merged PRs, 2 releases",
    detail: "[range=week]",
    id: "tool",
    kind: "tool",
    label: "notra_list_events",
  },
  {
    detail: '"AI changelog tools 2026"',
    id: "search",
    kind: "search",
  },
];

export const OPENCODE_DEMO_SOURCES: OpencodeSource[] = [
  {
    domain: "usenotra.com",
    title: "Notra changelog",
    url: "https://usenotra.com/changelog",
  },
  {
    domain: "keepachangelog.com",
    title: "Keep a Changelog",
    url: "https://keepachangelog.com/",
  },
  {
    domain: "github.blog",
    title: "GitHub changelog",
    url: "https://github.blog/changelog/",
  },
  {
    domain: "linear.app",
    title: "Linear changelog",
    url: "https://linear.app/changelog",
  },
];

export const OPENCODE_DEMO_QUERIES: string[] = [
  "best AI changelog tools 2026",
  "how teams write release notes",
];
