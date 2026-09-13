import {
  GEO_PERSONA_AGENT_MAX_TOKENS,
  GEO_PERSONA_AGENT_MODEL,
} from "@notra/ai/constants/geo-personas";
import { gateway } from "@notra/ai/gateway";
import {
  buildPersonaSystemPrompt,
  buildPersonaTurnPrompt,
} from "@notra/ai/prompts/geo-persona";
import { personaNextTurnOutputSchema } from "@notra/ai/schemas/geo-personas";
import type {
  PersonaNextTurnInput,
  PersonaNextTurnResult,
} from "@notra/ai/types/geo-personas";
import { createPersonaSnapshot } from "@notra/ai/utils/persona-snapshot";
import { generateText, Output } from "ai";

/**
 * Plays one turn with the complete profile and memories available each time.
 */
export async function generatePersonaNextTurn(
  input: PersonaNextTurnInput,
  abortSignal?: AbortSignal
): Promise<PersonaNextTurnResult> {
  const system = buildPersonaSystemPrompt(
    input.persona,
    input.engineLabel,
    input.maxTurns,
    input.memories
  );
  const snapshot = createPersonaSnapshot(input, system);
  const result = await generateText({
    model: gateway(GEO_PERSONA_AGENT_MODEL, {
      organizationId: input.organizationId,
    }),
    output: Output.object({ schema: personaNextTurnOutputSchema }),
    system,
    prompt: buildPersonaTurnPrompt(
      input.transcript,
      input.turnIndex,
      input.maxTurns
    ),
    maxOutputTokens: GEO_PERSONA_AGENT_MAX_TOKENS,
    abortSignal,
  });

  const output = result.output;
  const message = output.message.trim();
  return {
    message: output.done || message.length === 0 ? null : message,
    usage: { ...result.totalUsage, modelId: GEO_PERSONA_AGENT_MODEL },
    snapshot,
  };
}
