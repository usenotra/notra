import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import type { GeoPersonaSnapshot } from "@notra/db/types/geo-personas";

import type { GeoCheckContext } from "./geo";

export interface GeoConversationReplayInput {
  context: Omit<GeoCheckContext, "scanId" | "capturedAt">;
  fallbackModelId: string;
  properties: Record<string, string>;
  logPrefix: string;
  emptyMessage: string;
}

export type GeoConversationResult = Pick<
  GeoConversationOutcome,
  "rows" | "usage"
>;

export interface GeoConversationSource {
  promptId: string;
  sequenceId?: string;
  personaId?: string;
  prompts: readonly string[];
  snapshot?: GeoPersonaSnapshot;
  timeoutMs: number;
}

export interface GeoConversationOutcome {
  rows: GeoCheckWrite[];
  usage: AgentTokenUsage;
  engineUsage?: AgentTokenUsage;
  judgeUsage?: AgentTokenUsage;
  droppedTurns: number;
}
