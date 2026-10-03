import {
  CLAUDE_EFFORTS,
  CLAUDE_MEDIUM_EFFORT,
  CLAUDE_MODELS,
  CLAUDE_DEFAULT_MODEL_OPTION,
} from "../constants/claude-models";
import type {
  ClaudeEffortId,
  ClaudeEffortOption,
  ClaudeModelId,
  ClaudeModelOption,
} from "../types/claude";

export const getClaudeModel = (id: ClaudeModelId): ClaudeModelOption =>
  CLAUDE_MODELS.find((item) => item.id === id) ?? CLAUDE_DEFAULT_MODEL_OPTION;

export const getClaudeEffort = (id: ClaudeEffortId): ClaudeEffortOption =>
  CLAUDE_EFFORTS.find((item) => item.id === id) ?? CLAUDE_MEDIUM_EFFORT;

export const getLatestClaudeModels = (): ClaudeModelOption[] =>
  CLAUDE_MODELS.filter((item) => item.group === "latest");

export const getPreviousClaudeModels = (): ClaudeModelOption[] =>
  CLAUDE_MODELS.filter((item) => item.group === "previous");
