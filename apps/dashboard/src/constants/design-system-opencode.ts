import type { OpencodeSource } from "@notra/ui/types/opencode-skin";

import type {
  OpencodeStoryActivity,
  OpencodeStorySession,
} from "@/types/design-system-opencode";

export const OPENCODE_STORY_SESSION: OpencodeStorySession = {
  title: "Weekly changelog draft",
  agent: "Build",
  model: "Writer 0.1",
  provider: "Notra",
  effort: "high",
  cwd: "~/acme/web",
  branch: "feat/changelog-week-39",
  context: "41.2K (4%)",
  tokens: "41,207 tokens",
  used: "4% used",
  spent: "$0.18 spent",
  version: "1.18.33",
  servers: [
    { name: "notra", status: "Connected" },
    { name: "github", status: "Connected" },
    { name: "linear", status: "Connected" },
    { name: "vercel", status: "Disconnected" },
  ],
  turns: [
    {
      id: "changelog",
      prompt: "draft this week's changelog from the merged PRs",
      activities: [
        [{ id: "thought-1", kind: "thought", duration: "1.4s" }],
        [
          { id: "read-changelog", kind: "read", detail: "CHANGELOG.md" },
          { id: "read-voice", kind: "read", detail: "brand-voice.md" },
          {
            id: "events",
            kind: "tool",
            label: "notra_list_events",
            detail: "[range=week]",
          },
        ],
        [{ id: "thought-2", kind: "thought", duration: "2.0s" }],
      ],
      duration: "17.8s",
    },
  ],
};

export const OPENCODE_STORY_SOURCES: OpencodeSource[] = [
  {
    title: "Notra changelog",
    domain: "usenotra.com",
    url: "https://usenotra.com/changelog",
  },
  {
    title: "Keep a Changelog",
    domain: "keepachangelog.com",
    url: "https://keepachangelog.com/",
  },
  {
    title: "GitHub changelog",
    domain: "github.blog",
    url: "https://github.blog/changelog/",
  },
];

export const OPENCODE_STORY_ACTIVITIES: OpencodeStoryActivity[] = [
  { id: "thought", kind: "thought", duration: "1.4s" },
  { id: "read", kind: "read", detail: "brand-voice.md" },
  {
    id: "tool",
    kind: "tool",
    label: "notra_create_post",
    detail: "[type=changelog]",
  },
  { id: "search", kind: "search", detail: '"AI changelog tools 2026"' },
];
