import type {
  ClaudeEffortId,
  ClaudeEffortOption,
  ClaudeModelId,
  ClaudeModelOption,
} from "../types/claude";

export const CLAUDE_DEFAULT_MODEL: ClaudeModelId = "sonnet-5.5";

export const CLAUDE_DEFAULT_EFFORT: ClaudeEffortId = "medium";

export const CLAUDE_MEDIUM_EFFORT: ClaudeEffortOption = {
  id: "medium",
  label: "Medium",
};

const CLAUDE_SONNET_5_5_MODEL: ClaudeModelOption = {
  description: "Most efficient for simpler tasks",
  group: "latest",
  id: "sonnet-5.5",
  label: "Sonnet 5.5",
};

const previous = (
  id: ClaudeModelId,
  label: string,
  family: string
): ClaudeModelOption => ({
  description: `Previous ${family} generation`,
  group: "previous",
  id,
  label,
});

export const CLAUDE_MODELS: readonly ClaudeModelOption[] = [
  {
    description: "For your toughest challenges",
    group: "latest",
    id: "fable-5.1",
    label: "Fable 5.1",
  },
  {
    description: "For complex work and everyday tasks",
    group: "latest",
    id: "opus-5.5",
    label: "Opus 5.5",
  },
  CLAUDE_SONNET_5_5_MODEL,
  {
    description: "Fastest for quick answers",
    group: "latest",
    id: "haiku-4.5",
    label: "Haiku 4.5",
  },
  previous("fable-5", "Fable 5", "Fable"),
  previous("opus-5", "Opus 5", "Opus"),
  previous("sonnet-5", "Sonnet 5", "Sonnet"),
  previous("opus-4.8", "Opus 4.8", "Opus"),
  previous("opus-4.7", "Opus 4.7", "Opus"),
  previous("opus-4.6", "Opus 4.6", "Opus"),
  previous("opus-3", "Opus 3", "Opus"),
  previous("sonnet-4.6", "Sonnet 4.6", "Sonnet"),
];

export const CLAUDE_EFFORTS: readonly ClaudeEffortOption[] = [
  { id: "low", label: "Low" },
  CLAUDE_MEDIUM_EFFORT,
  { id: "high", label: "High" },
  { id: "extra", label: "Extra" },
  { id: "max", label: "Max" },
];

export const CLAUDE_DEFAULT_MODEL_OPTION: ClaudeModelOption =
  CLAUDE_SONNET_5_5_MODEL;
