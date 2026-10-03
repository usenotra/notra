import type { Contender } from "../types/eval";

export const JEV_MODEL_ID = "typesafe-ai/jev";

/** Models offered in the picker. Any other gateway id can be added at runtime. */
export const CONTENDER_CATALOG: readonly Contender[] = [
  { key: JEV_MODEL_ID, modelId: JEV_MODEL_ID, kind: "jev", label: "Jev" },
  {
    key: "openai/gpt-6-luna",
    modelId: "openai/gpt-6-luna",
    kind: "llm",
    label: "GPT-6 Luna",
  },
  {
    key: "openai/gpt-5.6-luna",
    modelId: "openai/gpt-5.6-luna",
    kind: "llm",
    label: "GPT-5.6 Luna",
  },
  {
    key: "openai/gpt-5.4-nano",
    modelId: "openai/gpt-5.4-nano",
    kind: "llm",
    label: "GPT-5.4 nano",
  },
  {
    key: "openai/gpt-oss-120b",
    modelId: "openai/gpt-oss-120b",
    kind: "llm",
    label: "gpt-oss-120b",
  },
  {
    key: "openai/gpt-6-sol",
    modelId: "openai/gpt-6-sol",
    kind: "llm",
    label: "GPT-6 Sol",
  },
  {
    key: "anthropic/claude-haiku-4.5",
    modelId: "anthropic/claude-haiku-4.5",
    kind: "llm",
    label: "Haiku 4.5",
  },
  {
    key: "anthropic/claude-sonnet-5",
    modelId: "anthropic/claude-sonnet-5",
    kind: "llm",
    label: "Sonnet 5",
  },
  {
    key: "anthropic/claude-opus-5.5",
    modelId: "anthropic/claude-opus-5.5",
    kind: "llm",
    label: "Opus 5.5",
  },
  {
    key: "google/gemini-3.5-flash-lite",
    modelId: "google/gemini-3.5-flash-lite",
    kind: "llm",
    label: "Gemini 3.5 Flash-Lite",
  },
];

export function contenderFromId(modelId: string): Contender {
  const known = CONTENDER_CATALOG.find((item) => item.modelId === modelId);
  if (known) {
    return known;
  }
  return {
    key: modelId,
    modelId,
    kind: modelId.startsWith("typesafe-ai/") ? "jev" : "llm",
    label: modelId.split("/").at(-1) ?? modelId,
  };
}
