import { createHash } from "node:crypto";

import type { GeoPersonaSnapshot } from "@notra/db/types/geo-personas";

import {
  GEO_PERSONA_AGENT_MODEL,
  GEO_PERSONA_PROMPT_VERSION,
} from "../constants/geo-personas";
import type { PersonaNextTurnInput } from "../types/geo-personas";

/** Captures the actual context, independently of later profile edits. */
export function createPersonaSnapshot(
  input: PersonaNextTurnInput,
  systemPrompt: string
): GeoPersonaSnapshot {
  const context = {
    persona: structuredClone(input.persona),
    memories: input.memories.map(({ id, kind, content }) => ({
      id,
      kind,
      content,
    })),
    model: GEO_PERSONA_AGENT_MODEL,
    promptVersion: GEO_PERSONA_PROMPT_VERSION,
    systemPrompt,
    engineLabel: input.engineLabel,
    maxTurns: input.maxTurns,
  };

  return {
    schemaVersion: 1,
    version: createHash("sha256").update(JSON.stringify(context)).digest("hex"),
    ...context,
  };
}
