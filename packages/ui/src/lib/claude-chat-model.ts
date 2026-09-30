import {
  CLAUDE_CHAT_EFFORTS,
  CLAUDE_CHAT_HOCH_EFFORT,
  CLAUDE_CHAT_MODELS,
  CLAUDE_CHAT_OPUS_5_5_MODEL,
} from "../constants/claude-chat-models";
import type {
  ClaudeChatEffortId,
  ClaudeChatEffortOption,
  ClaudeChatModelId,
  ClaudeChatModelOption,
} from "../types/claude-chat";

export function getClaudeChatModel(
  id: ClaudeChatModelId
): ClaudeChatModelOption {
  return (
    CLAUDE_CHAT_MODELS.find((item) => item.id === id) ?? CLAUDE_CHAT_OPUS_5_5_MODEL
  );
}

export function getClaudeChatEffort(
  id: ClaudeChatEffortId
): ClaudeChatEffortOption {
  return (
    CLAUDE_CHAT_EFFORTS.find((item) => item.id === id) ?? CLAUDE_CHAT_HOCH_EFFORT
  );
}

export function getOtherClaudeChatModels(selectedId: ClaudeChatModelId): {
  latest: ClaudeChatModelOption[];
  previous: ClaudeChatModelOption[];
} {
  const rest = CLAUDE_CHAT_MODELS.filter((item) => item.id !== selectedId);

  return {
    latest: rest.filter((item) => item.group === "latest"),
    previous: rest.filter((item) => item.group === "previous"),
  };
}
