import type { GeminiModelId, GeminiModelOption } from "../types/gemini";

export const GEMINI_DEFAULT_MODEL: GeminiModelId = "pro";

export const GEMINI_PRO_MODEL: GeminiModelOption = {
  chip: "Pro",
  description: "Reasoning",
  group: "core",
  id: "pro",
  label: "3.1 Pro",
};

export const GEMINI_MODELS: readonly GeminiModelOption[] = [
  {
    chip: "Flash-Lite",
    description: "Fastest answers",
    group: "core",
    id: "flash-lite",
    label: "3.5 Flash-Lite",
  },
  {
    badge: "New",
    chip: "Flash",
    description: "Versatile help",
    group: "core",
    id: "flash",
    label: "3.7 Flash",
  },
  GEMINI_PRO_MODEL,
  {
    chip: "Thinking",
    description: "Complex problem solving",
    group: "thinking",
    id: "thinking",
    label: "Thinking (extended)",
  },
];
