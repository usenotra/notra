import type {
  ClaudeChatEffortId,
  ClaudeChatEffortOption,
  ClaudeChatModelId,
  ClaudeChatModelOption,
} from "../types/claude-chat";

export const CLAUDE_CHAT_DEFAULT_MODEL: ClaudeChatModelId = "opus-5.5";
export const CLAUDE_CHAT_DEFAULT_EFFORT: ClaudeChatEffortId = "hoch";

export const CLAUDE_CHAT_OPUS_5_5_MODEL: ClaudeChatModelOption = {
  id: "opus-5.5",
  label: "Opus 5.5",
  description: "Für komplexe Aufgaben",
  group: "latest",
};

export const CLAUDE_CHAT_HOCH_EFFORT: ClaudeChatEffortOption = {
  id: "hoch",
  label: "Hoch",
  badge: "Standard",
};

export const CLAUDE_CHAT_MODELS: readonly ClaudeChatModelOption[] = [
  CLAUDE_CHAT_OPUS_5_5_MODEL,
  {
    id: "opus-5",
    label: "Opus 5",
    description: "Vorherige Opus-Generation",
    group: "previous",
  },
  {
    id: "fable-5",
    label: "Fable 5",
    description: "Für Coding und lange Aufgaben",
    group: "latest",
  },
  {
    id: "sonnet-5",
    label: "Sonnet 5",
    description: "Für die tägliche Arbeit",
    group: "latest",
  },
  {
    id: "haiku-4.5",
    label: "Haiku 4.5",
    description: "Schnell und leicht",
    group: "latest",
  },
  {
    id: "opus-4.8",
    label: "Opus 4.8",
    description: "Vorherige Opus-Generation",
    group: "previous",
  },
  {
    id: "opus-4.7",
    label: "Opus 4.7",
    description: "Vorherige Opus-Generation",
    group: "previous",
  },
  {
    id: "opus-4.6",
    label: "Opus 4.6",
    description: "Vorherige Opus-Generation",
    group: "previous",
  },
  {
    id: "opus-3",
    label: "Opus 3",
    description: "Vorherige Opus-Generation",
    group: "previous",
  },
  {
    id: "sonnet-4.6",
    label: "Sonnet 4.6",
    description: "Vorherige Sonnet-Generation",
    group: "previous",
  },
];

export const CLAUDE_CHAT_EFFORTS: readonly ClaudeChatEffortOption[] = [
  { id: "niedrig", label: "Niedrig" },
  { id: "mittel", label: "Mittel" },
  CLAUDE_CHAT_HOCH_EFFORT,
  { id: "extra", label: "Extra" },
  {
    id: "max",
    label: "Max",
    info: "Höchster Denkaufwand — für besonders schwere Aufgaben.",
  },
];
