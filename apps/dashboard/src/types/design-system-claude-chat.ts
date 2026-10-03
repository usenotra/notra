import type { ClaudeChatMessageRole } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-message";
import type {
  ClaudeChatSearchGroup,
  ClaudeChatSearchStep,
} from "@notra/ui/components/ai-skins/claude-chat/claude-chat-search";
import type { ClaudeChatSourcePill } from "@notra/ui/components/ai-skins/claude-chat/claude-chat-sources";

export interface ClaudeChatStorySearch {
  verb: string;
  groups: ClaudeChatSearchGroup[];
  steps?: ClaudeChatSearchStep[];
}

export interface ClaudeChatStoryMessage {
  id: string;
  from: ClaudeChatMessageRole;
  text: string;
  search?: ClaudeChatStorySearch;
  sources?: ClaudeChatSourcePill[];
}
