import {
  AiMagicIcon,
  Image02Icon,
  QuillWrite01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";

import type { ChatSubagentConfig } from "@/types/components/chat-subagent-block";

// Keyed by the eve subagent tool name the root agent calls.
export const CHAT_SUBAGENTS: Record<string, ChatSubagentConfig> = {
  "code-researcher": {
    labelKey: "codeResearcher",
    icon: SourceCodeIcon,
  },
  "content-writer": {
    labelKey: "contentWriter",
    icon: QuillWrite01Icon,
  },
  "image-designer": {
    labelKey: "imageDesigner",
    icon: Image02Icon,
  },
};

export const CHAT_SUBAGENT_FALLBACK: ChatSubagentConfig = {
  labelKey: "fallback",
  icon: AiMagicIcon,
};
