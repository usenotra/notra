import type { AgentTokenUsage } from "@notra/ai/types/agents";
import type { PersonaConversationTurn } from "@notra/ai/types/geo-personas";
import type { GeoCheckWrite } from "@notra/db/types/geo-checks";
import type { GeoPersonaSnapshot } from "@notra/db/types/geo-personas";
import type { Effect } from "effect";

import type { GeoScanError } from "../geo/errors";
import type { GeoCheckContext } from "./geo";
import type { GeoTokenUsageInput } from "./token-usage";

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

export interface GeoConversationQuestion {
  message: string | null;
  usage: GeoTokenUsageInput;
  snapshot?: GeoPersonaSnapshot;
}

export interface GeoConversationSource<R> {
  promptId: string;
  sequenceId?: string;
  personaId?: string;
  maxTurns: number;
  timeoutMs: number;
  next: (
    transcript: readonly PersonaConversationTurn[],
    index: number
  ) => Effect.Effect<GeoConversationQuestion, GeoScanError, R>;
}

export interface GeoConversationOutcome {
  rows: GeoCheckWrite[];
  usage: AgentTokenUsage;
  droppedTurns: number;
  stoppedEarly: boolean;
}
