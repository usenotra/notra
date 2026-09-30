import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { RouteMetadata } from "@notra/ai/types/router";
import type { LanguageModelUsage } from "ai";

export type GeoTokenUsageInput = Partial<AgentTokenUsage> &
  Pick<Partial<LanguageModelUsage>, "inputTokenDetails" | "outputTokenDetails">;

export interface GeoModelTokenUsage extends LanguageModelUsage {
  modelId?: string;
  route?: RouteMetadata;
  totalUsd?: number;
  computeMs?: number;
}
