import type { LandingHero, LandingSection } from "../types/landing";

export const LANDING_HERO: LandingHero = {
  description:
    "The building blocks of the Notra dashboard, documented and rendered live with the real styles.",
  install: {
    item: "perplexity",
    prefix: "bunx shadcn@latest add @notra/",
  },
};

export const LANDING_SECTIONS: LandingSection[] = [
  {
    items: [
      {
        description:
          "The gradient marketing buttons from the Notra landing page.",
        href: "/components/marketing-button",
        title: "Marketing Button",
      },
      {
        description: "A muted header band tucked behind the content card.",
        href: "/components/tooltip",
        preview: "tooltip",
        title: "Tooltip",
      },
      {
        description:
          "A light sweep across text for thinking and loading states.",
        href: "/components/shimmer",
        title: "Shimmer",
      },
    ],
    description: "Primitives and small pieces used across the dashboard.",
    title: "Components",
  },
  {
    items: [
      {
        description:
          "Google's AI Overview with highlights, citation chips and a collapsible Show more.",
        href: "/blocks/google-ai-overview",
        preview: "ai-overview",
        title: "Google AI Overview",
      },
    ],
    description: "Search result surfaces, rebuilt pixel for pixel.",
    title: "Search",
  },
  {
    items: [
      {
        description:
          "A Perplexity answer thread with the search step, citation pills, a sources sheet and the composer.",
        href: "/blocks/perplexity",
        title: "Perplexity",
      },
      {
        description:
          "A ChatGPT conversation with reasoning, web search, an Activity sheet and the model picker.",
        href: "/blocks/chatgpt",
        title: "ChatGPT",
      },
      {
        description:
          "The Gemini chat with its animated sparkle, streamed replies and the model picker.",
        href: "/blocks/gemini",
        title: "Gemini",
      },
      {
        description:
          "The claude.ai chat with a live search timeline, serif replies and the effort picker.",
        href: "/blocks/claude",
        title: "Claude",
      },
    ],
    description:
      "Chat apps with replayable conversations, search steps and composers.",
    title: "Browser Apps",
  },
  {
    items: [
      {
        description:
          "A Claude Code terminal session with todos, tool calls and the prompt.",
        href: "/blocks/claude-code",
        title: "Claude Code",
      },
      {
        description:
          "A Codex CLI session with exec cells and the prompt status line.",
        href: "/blocks/codex",
        title: "Codex",
      },
      {
        description:
          "The OpenCode workspace with activity, cited sources and the sidebar.",
        href: "/blocks/opencode",
        title: "OpenCode",
      },
    ],
    description:
      "Coding agents in the terminal, from the welcome banner to the prompt.",
    title: "Terminal Apps",
  },
];
