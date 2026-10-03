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
  /** Charges this multiple of the run's answers and usage; defaults to 1. */
  billingMultiplier?: number;
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
  /** Defaults to English. */
  language?: string;
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
