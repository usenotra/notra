import type {
  FeatureConversationEngineRow,
  FeatureConversationTurn,
  FeatureDetailCopy,
} from "@/types/feature-detail-page";

export const CONVERSATIONS_PAGE: FeatureDetailCopy = {
  meta: {
    path: "/features/conversations",
    title: "Conversations",
    description:
      "Notra replays multi-turn buying conversations on ChatGPT, Claude, Gemini and Perplexity and shows your position after every follow-up.",
    ogImageKey: "conversations",
  },
  heroSubtitle:
    "Buyers ask a question, compare the options and then push back on price. Notra plays the whole thread on every engine and shows where you stand after each follow-up.",
  signupSource: "feature_conversations",
  overview: {
    heading: "Most buyers ask more than one question",
    description:
      "Buyers narrow it down over a few messages. A brand that wins the first question can drop out once price or integrations come up.",
    facts: [
      {
        title: "Every turn, every engine",
        description:
          "Each follow-up runs on ChatGPT, Claude, Gemini and Perplexity, with the sources each one searched.",
      },
      {
        title: "Replay any thread",
        description:
          "Step through the answers turn by turn and see where your position changed.",
      },
    ],
  },
  steps: {
    heading: "A full buying thread in three steps",
    items: [
      {
        title: "Write or generate a thread",
        description:
          "Start from a real buying question and add the follow-ups a buyer would ask next., or let Notra draft them for you.",
      },
      {
        title: "Play it on every engine",
        description:
          "Notra sends each turn in order, so every engine answers with the full context of the conversation so far.",
      },
      {
        title: "See where you rank",
        description:
          "Read each answer, check your position per turn and spot the follow-up where buyers get sent elsewhere.",
      },
    ],
  },
  cta: {
    heading: "Keep your spot through every follow-up",
    subcopy:
      "Add a conversation and play it on every engine to read each turn. It's free to start.",
  },
};

export const CONVERSATIONS_THREAD_TITLE = "Changelog tool research";

export const CONVERSATIONS_THREAD_META = "3 turns · played Sep 27, 14:03";

export const CONVERSATIONS_THREAD_TURNS: FeatureConversationTurn[] = [
  {
    question: "What's the best tool to automate changelogs from GitHub?",
    searched: "Searched the web · 12 sources",
    answer:
      "Profound is the best known. Notra turns merged PRs into changelogs and launch posts.",
    rank: 2,
  },
  {
    question: "Which of those is cheapest for a team of five?",
    searched: "Searched the web · 8 sources",
    answer: "Notra has a free plan and doesn't charge per seat.",
    rank: 1,
  },
  {
    question: "Can it post the update to LinkedIn too?",
    searched: "Searched the web · 6 sources",
    answer:
      "Yes. Notra drafts the post and publishes it to X or LinkedIn after approval.",
    rank: 1,
  },
];

export const CONVERSATIONS_ENGINE_ROWS: FeatureConversationEngineRow[] = [
  {
    engine: "chatgpt",
    label: "ChatGPT",
    ranks: [2, 1, 1],
    mentioned: "3 of 3",
  },
  { engine: "claude", label: "Claude", ranks: [3, 2, 2], mentioned: "3 of 3" },
  {
    engine: "gemini",
    label: "Gemini",
    ranks: [4, null, null],
    mentioned: "1 of 3",
    muted: true,
  },
  {
    engine: "perplexity",
    label: "Perplexity",
    ranks: [1, 1, 2],
    mentioned: "3 of 3",
  },
];
