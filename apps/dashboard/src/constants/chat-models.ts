import type { ChatModelOption } from "@/types/components/chat-input";

export const AVAILABLE_MODELS = [
  {
    id: "auto",
    label: "Auto",
    description: "Picks the best model for your message",
    pricing: "Varies by selected model",
    provider: "auto",
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Claude Opus 5.5",
    description: "Latest Opus for complex work",
    pricing: "$4 input / $20 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Sonnet 5",
    description: "Everyday work and coding",
    pricing: "$2 input / $10 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Haiku 4.5",
    description: "Fast responses",
    pricing: "$1 input / $5 output per 1M",
    provider: "anthropic",
  },
  {
    id: "openai/gpt-6-sol",
    label: "GPT-6 Sol",
    description: "Advanced reasoning and complex tasks",
    pricing: "$2 input / $10 output per 1M",
    provider: "openai",
  },
  {
    id: "openai/gpt-6-luna",
    label: "GPT-6 Luna",
    description: "Fast and affordable",
    pricing: "$0.10 input / $0.50 output per 1M",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    description: "OpenAI model with a ZDR route",
    pricing: "$2 input / $10 output per 1M",
    provider: "openai",
  },
] satisfies [ChatModelOption, ...ChatModelOption[]];

export const ZDR_AVAILABLE_MODELS = AVAILABLE_MODELS.filter(
  (model) => model.id !== "openai/gpt-6-sol" && model.id !== "openai/gpt-6-luna"
);

export const LEGACY_CHAT_MODELS = [
  {
    id: "anthropic/claude-opus-5",
    label: "Claude Opus 5",
    description: "Previous Opus generation",
    pricing: "$5 input / $25 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    description: "Previous Opus generation",
    pricing: "$5 input / $25 output per 1M",
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Sonnet 4.6",
    description: "Previous Sonnet generation",
    pricing: "$3 input / $15 output per 1M",
    provider: "anthropic",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "Previous OpenAI model",
    pricing: "$5 input / $30 output per 1M",
    provider: "openai",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    description: "Previous OpenAI model",
    pricing: "$2.50 input / $15 output per 1M",
    provider: "openai",
  },
] satisfies ChatModelOption[];
