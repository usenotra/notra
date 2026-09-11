import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { LanguageModelUsage } from "ai";

export type GeoTokenUsageInput = Partial<AgentTokenUsage> &
  Pick<Partial<LanguageModelUsage>, "inputTokenDetails">;

export interface GeoModelTokenUsage extends LanguageModelUsage {
  modelId?: string;
  totalUsd?: number;
  computeMs?: number;
}
