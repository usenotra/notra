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
    id: "blogPost",
    prompt:
      "Help me write a blog post. Ask me 1-2 questions about the topic and audience before drafting.",
    icon: News01Icon,
  },
  {
    id: "releaseNotes",
    prompt:
      "Help me draft a changelog. Ask me what changed and which release or repo to reference.",
    icon: Blockchain04Icon,
  },
  {
    id: "socialPost",
    prompt:
      "Help me write a social post. Ask me whether it's for Twitter or LinkedIn, then the topic and angle before drafting.",
    icon: Sent02Icon,
  },
];

export const DASHBOARD_AGENT_SUGGESTIONS: ChatSuggestion[] = [
  ...CHAT_SUGGESTIONS,
  {
    id: "newsletter",
    prompt:
      "Help me outline a newsletter. Ask me the audience and what this edition should cover before drafting.",
    icon: Mail01Icon,
  },
  {
    id: "comparison",
    prompt:
      "Help me write a comparison. Ask me who we're comparing against and what the reader is deciding before drafting.",
    icon: AnalyticsUpIcon,
  },
  {
    id: "geoStatus",
    prompt:
      "How is our GEO going? Load the overview and mention-rate trend for the last 30 days, then tell me what is improving or slipping.",
    icon: ChartHistogramIcon,
  },
  {
    id: "geoVisibility",
    prompt:
      "Help me improve our GEO visibility. Ask me which prompt or topic to focus on, then suggest what to change.",
    icon: AiBrowserIcon,
  },
  {
    id: "brandVoice",
    prompt:
      "Help me rewrite copy in our brand voice. Ask me for the draft and where it will run before rewriting.",
    icon: PaintBoardIcon,
  },
  {
    id: "thread",
    prompt:
      "Help me turn a topic into a social thread. Ask me the platform and the core point before drafting.",
    icon: Comment01Icon,
  },
  {
    id: "faq",
    prompt:
      "Help me draft an FAQ. Ask me the product and the questions customers actually ask before writing.",
    icon: HelpCircleIcon,
  },
];
