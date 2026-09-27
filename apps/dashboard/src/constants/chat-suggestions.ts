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
    icon: News01Icon,
  },
  {
    id: "releaseNotes",
    icon: Blockchain04Icon,
  },
  {
    id: "socialPost",
    icon: Sent02Icon,
  },
];

export const DASHBOARD_AGENT_SUGGESTIONS: ChatSuggestion[] = [
  ...CHAT_SUGGESTIONS,
  {
    id: "newsletter",
    icon: Mail01Icon,
  },
  {
    id: "comparison",
    icon: AnalyticsUpIcon,
  },
  {
    id: "geoStatus",
    icon: ChartHistogramIcon,
  },
  {
    id: "geoVisibility",
    icon: AiBrowserIcon,
  },
  {
    id: "brandVoice",
    icon: PaintBoardIcon,
  },
  {
    id: "thread",
    icon: Comment01Icon,
  },
  {
    id: "faq",
    icon: HelpCircleIcon,
  },
];
