import type {
  ClaudeDemoMessage,
  ClaudeDemoSearch,
  ClaudeSourceItem,
} from "../types/claude";

export const CLAUDE_DEMO_SOURCES: ClaudeSourceItem[] = [
  {
    domain: "reuters.com",
    href: "https://www.reuters.com/world/",
    title: "Reuters: World news for Tuesday, September 29",
  },
  {
    domain: "apnews.com",
    href: "https://apnews.com/",
    title: "AP News: Top headlines and what to know today",
  },
];

export const CLAUDE_DEMO_THREAD: ClaudeDemoMessage[] = [
  {
    from: "user",
    id: "u-1",
    text: "what's in the news today",
  },
  {
    from: "assistant",
    id: "a-1",
    search: {
      groups: [],
      items: [
        { detail: "Executor", label: "Loaded", tool: "Executor", type: "tool" },
        {
          count: 10,
          detail: "news today September 29 2026",
          label: "Searched the web",
          results: [
            {
              domain: "www.reuters.com",
              title: "World news for Tuesday, September 29",
            },
            {
              domain: "apnews.com",
              title: "Top headlines: what to know today",
            },
            { domain: "en.wikipedia.org", title: "Portal: Current events" },
          ],
          type: "tool",
        },
        { text: "Summarizing today's headlines.", type: "thought" },
      ],
      verb: "Triangulating",
    },
    sources: CLAUDE_DEMO_SOURCES,
    text: "European markets open higher after strong **US tech earnings**, while EU states split over how to enforce the **AI Act**.",
  },
];

export const CLAUDE_DEMO_REPLIES = [
  "Got it. Let me know when you want to keep going.",
  "Sure. I'm here.",
  "Noted. What's next?",
] as const;

export const CLAUDE_DEMO_USER_MESSAGES = CLAUDE_DEMO_THREAD.filter(
  (message) => message.from === "user"
);

export const CLAUDE_DEMO_ASSISTANT_MESSAGES = CLAUDE_DEMO_THREAD.filter(
  (message) => message.from === "assistant"
);

export const CLAUDE_DEMO_SEARCH: ClaudeDemoSearch = {
  groups: [
    {
      count: 3,
      query: "hoplite.sh",
      results: [
        {
          domain: "hoplite.sh",
          title: "Hoplite: sandboxed shells for AI agents",
        },
        { domain: "github.com", title: "hoplite-sh/hoplite on GitHub" },
        { domain: "news.ycombinator.com", title: "Show HN: Hoplite" },
      ],
    },
  ],
  steps: [{ icon: "error", label: "Fetch failed" }],
  summary: "Researched hoplite.sh",
  thought: "Researching hoplite.sh.",
  verb: "Triangulating",
};
