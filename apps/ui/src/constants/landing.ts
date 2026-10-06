import type { LandingHero, LandingSection } from "../types/landing";

export const LANDING_HERO: LandingHero = {
  description:
    "The building blocks of the Notra dashboard, documented and rendered live with the real styles.",
  install: {
    items: [
      "perplexity",
      "chatgpt",
      "claude-code",
      "gemini",
      "codex",
      "claude",
      "opencode",
    ],
    prefix: "bunx shadcn@latest add @notra/",
  },
};

export const LANDING_SECTIONS: LandingSection[] = [
  {
    items: [
      {
        description:
          "Primary, secondary, outline and destructive with a soft gradient and squircle corners.",
        href: "/components/button",
        preview: "button",
        title: "Button",
      },
      {
        description:
          "The gradient marketing buttons from the Notra landing page.",
        href: "/components/marketing-button",
        preview: "marketing-button",
        title: "Marketing Button",
      },
      {
        description:
          "The Depth surface of the buttons, gliding between neighbouring triggers.",
        href: "/components/tooltip",
        preview: "tooltip",
        title: "Tooltip",
      },
      {
        description: "A muted header band tucked behind the content card.",
        href: "/components/duotone-tooltip",
        preview: "duotone-tooltip",
        title: "Duotone Tooltip",
      },
      {
        description:
          "A light sweep across text for thinking and loading states.",
        href: "/components/shimmer",
        preview: "shimmer",
        title: "Shimmer",
      },
      {
        description:
          "A rail of lines that maps a conversation, with a preview card per turn.",
        href: "/components/chat-minimap",
        preview: "chat-minimap",
        title: "Chat Minimap",
      },
      {
        description:
          "A sortable, paged table in the grey shell, with an infinite-scroll variant.",
        href: "/components/data-table",
        preview: "data-table",
        title: "Data Table",
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
        preview: "perplexity",
        title: "Perplexity",
      },
      {
        description:
          "A ChatGPT conversation with reasoning, web search, an Activity sheet and the model picker.",
        href: "/blocks/chatgpt",
        preview: "chatgpt",
        title: "ChatGPT",
      },
      {
        description:
          "The Gemini chat with its animated sparkle, streamed replies and the model picker.",
        href: "/blocks/gemini",
        preview: "gemini",
        title: "Gemini",
      },
      {
        description:
          "The claude.ai chat with a live search timeline, serif replies and the effort picker.",
        href: "/blocks/claude",
        preview: "claude",
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
          "A Claude Code terminal session with tool calls, todos and the prompt.",
        href: "/blocks/claude-code",
        preview: "claude-code",
        title: "Claude Code",
      },
      {
        description:
          "A Codex CLI session with Ran and Explored cells and the composer.",
        href: "/blocks/codex",
        preview: "codex",
        title: "Codex",
      },
      {
        description:
          "The OpenCode workspace with activity, cited sources and the sidebar.",
        href: "/blocks/opencode",
        preview: "opencode",
        title: "OpenCode",
      },
    ],
    description:
      "Coding agents in the terminal, from the welcome banner to the prompt.",
    title: "Terminal Apps",
  },
];
