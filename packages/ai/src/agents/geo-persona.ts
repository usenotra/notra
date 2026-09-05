import {
  GEO_PERSONA_AGENT_MAX_STEPS,
  GEO_PERSONA_AGENT_MAX_TOKENS,
  GEO_PERSONA_AGENT_MODEL,
} from "@notra/ai/constants/geo-personas";
import { gateway } from "@notra/ai/gateway";
import {
  buildPersonaSystemPrompt,
  buildPersonaTurnPrompt,
} from "@notra/ai/prompts/geo-persona";
import { personaNextTurnOutputSchema } from "@notra/ai/schemas/geo-personas";
import {
  createListPersonaMemoriesTool,
  createSearchPersonaMemoriesTool,
} from "@notra/ai/tools/persona-memory";
import type {
  PersonaNextTurnInput,
  PersonaNextTurnResult,
} from "@notra/ai/types/geo-personas";
import { generateText, Output, stepCountIs } from "ai";

/**
 * Plays one turn of a simulated buyer: the persona recalls its memories through
 * the two read-only tools and then types the next message, or stops.
 */
export async function generatePersonaNextTurn(
  input: PersonaNextTurnInput,
  abortSignal?: AbortSignal
): Promise<PersonaNextTurnResult> {
  const memoryConfig = {
    personaId: input.persona.id,
    memories: input.memories,
  };
  const result = await generateText({
    model: gateway(GEO_PERSONA_AGENT_MODEL, {
      organizationId: input.organizationId,
    }),
    tools: {
      listMemories: createListPersonaMemoriesTool(memoryConfig),
      searchMemories: createSearchPersonaMemoriesTool(memoryConfig),
    },
    stopWhen: stepCountIs(GEO_PERSONA_AGENT_MAX_STEPS),
    output: Output.object({ schema: personaNextTurnOutputSchema }),
    system: buildPersonaSystemPrompt(
      input.persona,
      input.engineLabel,
      input.maxTurns
    ),
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
    usage: result.totalUsage,
  };
}
