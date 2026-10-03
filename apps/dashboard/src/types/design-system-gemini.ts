import type { GeminiMessageRole } from "@notra/ui/components/ai-skins/gemini/gemini-message";

export interface GeminiStoryMessage {
  id: string;
  from: GeminiMessageRole;
  text: string;
  search?: boolean;
}
