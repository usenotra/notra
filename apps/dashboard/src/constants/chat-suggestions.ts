import {
  AiBrowserIcon,
  AnalyticsUpIcon,
  Blockchain04Icon,
  ChartHistogramIcon,
  Comment01Icon,
  HelpCircleIcon,
  Mail01Icon,
  News01Icon,
  PaintBoardIcon,
  Sent02Icon,
} from "@hugeicons/core-free-icons";

import type { ChatSuggestion } from "@/types/components/chat-suggestions";

export const CHAT_SUGGESTION_ROTATE_MS = 4000;
export const CHAT_SUGGESTION_VISIBLE_COUNT = 3;
export const CHAT_SUGGESTION_SWAP_DISTANCE_PX = 4;
export const CHAT_SUGGESTION_SWAP_BLUR_PX = 2;

export const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  {
    title: "Write a blog post",
    description: "Turn a topic into a well-scoped article",
    prompt:
      "Help me write a blog post. Ask me 1-2 questions about the topic and audience before drafting.",
    icon: News01Icon,
  },
  {
    title: "Draft release notes",
    description: "Summarize what shipped and why it matters",
    prompt:
      "Help me draft a changelog. Ask me what changed and which release or repo to reference.",
    icon: Blockchain04Icon,
  },
  {
    title: "Write a social post",
    description: "Draft a Twitter or LinkedIn update",
    prompt:
      "Help me write a social post. Ask me whether it's for Twitter or LinkedIn, then the topic and angle before drafting.",
    icon: Sent02Icon,
  },
];

export const DASHBOARD_AGENT_SUGGESTIONS: ChatSuggestion[] = [
  ...CHAT_SUGGESTIONS,
  {
    title: "Outline a newsletter",
    description: "Plan the edition before you write it",
    prompt:
      "Help me outline a newsletter. Ask me the audience and what this edition should cover before drafting.",
    icon: Mail01Icon,
  },
  {
    title: "Compare us vs them",
    description: "Frame the difference for a buyer",
    prompt:
      "Help me write a comparison. Ask me who we're comparing against and what the reader is deciding before drafting.",
    icon: AnalyticsUpIcon,
  },
  {
    title: "How is GEO going?",
    description: "See mention trends across engines",
    prompt:
      "How is our GEO going? Load the overview and mention-rate trend for the last 30 days, then tell me what is improving or slipping.",
    icon: ChartHistogramIcon,
  },
  {
    title: "Improve GEO visibility",
    description: "Tighten how we show up in answers",
    prompt:
      "Help me improve our GEO visibility. Ask me which prompt or topic to focus on, then suggest what to change.",
    icon: AiBrowserIcon,
  },
  {
    title: "Match our brand voice",
    description: "Rewrite a draft so it sounds like us",
    prompt:
      "Help me rewrite copy in our brand voice. Ask me for the draft and where it will run before rewriting.",
    icon: PaintBoardIcon,
  },
  {
    title: "Turn this into a thread",
    description: "Break a point into a social sequence",
    prompt:
      "Help me turn a topic into a social thread. Ask me the platform and the core point before drafting.",
    icon: Comment01Icon,
  },
  {
    title: "Draft an FAQ page",
    description: "Answer the questions people actually ask",
    prompt:
      "Help me draft an FAQ. Ask me the product and the questions customers actually ask before writing.",
    icon: HelpCircleIcon,
  },
];
