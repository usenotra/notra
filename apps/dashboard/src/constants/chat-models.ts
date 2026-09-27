import type { ChatModelOption } from "@/types/components/chat-input";

export const AVAILABLE_MODELS = [
  {
    id: "auto",
    label: "Auto",
    description: "auto",
    pricing: "varies",
    provider: "auto",
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Claude Opus 5.5",
    description: "latestOpus",
    pricing: { input: "4", output: "20" },
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-5",
    label: "Sonnet 5",
    description: "everyday",
    pricing: { input: "2", output: "10" },
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    label: "Haiku 4.5",
    description: "fast",
    pricing: { input: "1", output: "5" },
    provider: "anthropic",
  },
  {
    id: "openai/gpt-6-sol",
    label: "GPT-6 Sol",
    description: "advancedReasoning",
    pricing: { input: "2", output: "10" },
    provider: "openai",
  },
  {
    id: "openai/gpt-6-luna",
    label: "GPT-6 Luna",
    description: "fastAffordable",
    pricing: { input: "0.10", output: "0.50" },
    provider: "openai",
  },
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    description: "zdrRoute",
    pricing: { input: "2–4", output: "10–20" },
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
    description: "previousOpus",
    pricing: { input: "5", output: "25" },
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-opus-4.8",
    label: "Claude Opus 4.8",
    description: "previousOpus",
    pricing: { input: "5", output: "25" },
    provider: "anthropic",
  },
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Sonnet 4.6",
    description: "previousSonnet",
    pricing: { input: "3", output: "15" },
    provider: "anthropic",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    description: "previousOpenai",
    pricing: { input: "5", output: "30" },
    provider: "openai",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    description: "previousOpenai",
    pricing: { input: "2.50", output: "15" },
    provider: "openai",
  },
] satisfies ChatModelOption[];
