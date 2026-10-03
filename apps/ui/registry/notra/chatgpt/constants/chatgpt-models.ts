import type {
  ChatgptEffortId,
  ChatgptEffortOption,
  ChatgptModelId,
  ChatgptModelOption,
} from "../types/chatgpt";

export const CHATGPT_DEFAULT_MODEL: ChatgptModelId = "latest";

export const CHATGPT_DEFAULT_EFFORT: ChatgptEffortId = "medium";

export const CHATGPT_LATEST_MODEL: ChatgptModelOption = {
  id: "latest",
  label: "Latest",
  shortLabel: "6",
};

export const CHATGPT_MEDIUM_EFFORT: ChatgptEffortOption = {
  id: "medium",
  label: "Medium",
};

/** Ordered like the slider stops, from the left. */
export const CHATGPT_EFFORTS: readonly ChatgptEffortOption[] = [
  { id: "instant", label: "Instant" },
  CHATGPT_MEDIUM_EFFORT,
  { id: "high", label: "High" },
  { id: "extra-high", label: "Extra High" },
  { id: "pro", label: "Pro" },
];

export const CHATGPT_MODELS: readonly ChatgptModelOption[] = [
  CHATGPT_LATEST_MODEL,
  { id: "sol", label: "GPT-5.6 Sol", shortLabel: "5.6" },
  {
    description: "Leaving on October 14",
    id: "gpt-5.5",
    label: "GPT-5.5",
    shortLabel: "5.5",
  },
];
