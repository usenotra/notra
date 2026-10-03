import { GEMINI_MODELS, GEMINI_PRO_MODEL } from "../constants/gemini-models";
import type {
  GeminiModelGroup,
  GeminiModelId,
  GeminiModelOption,
} from "../types/gemini";

export const getGeminiModel = (
  id: GeminiModelId,
  models: readonly GeminiModelOption[] = GEMINI_MODELS
): GeminiModelOption =>
  models.find((item) => item.id === id) ?? models[0] ?? GEMINI_PRO_MODEL;

export const getGeminiModelsByGroup = (
  group: GeminiModelGroup,
  models: readonly GeminiModelOption[] = GEMINI_MODELS
): GeminiModelOption[] => models.filter((item) => item.group === group);
