import type {
  ChatgptActivitySite,
  ChatgptActivitySource,
} from "@notra/ui/components/ai-skins/chatgpt/chatgpt-activity";
import type { ChatgptMessageRole } from "@notra/ui/types/chatgpt";

export interface ChatgptStorySearch {
  websites: number;
  sites: ChatgptActivitySite[];
  sources: ChatgptActivitySource[];
  sourceCount?: number;
}

export interface ChatgptStoryReasoning {
  seconds: number;
  text: string;
  search?: ChatgptStorySearch;
}

export interface ChatgptStoryMessage {
  id: string;
  from: ChatgptMessageRole;
  text: string;
  reasoning?: ChatgptStoryReasoning;
}
