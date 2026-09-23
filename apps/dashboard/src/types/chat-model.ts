import type { ChatModel } from "@notra/ai/types/chat";

export interface ChatModelOption {
  id: ChatModel;
  label: string;
  description: string;
  pricing: string;
  provider: "auto" | "anthropic" | "openai";
}
