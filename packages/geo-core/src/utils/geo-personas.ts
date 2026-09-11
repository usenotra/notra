import {
  GEO_PERSONA_FIELD_MAX_LENGTH,
  GEO_PERSONA_MAX_COUNT,
  GEO_PERSONA_MAX_MEMORIES,
  GEO_PERSONA_MEMORY_MAX_LENGTH,
  GEO_PERSONA_PROFILE_LIST_MAX,
  GEO_PERSONA_SCAN_ID_PREFIX,
  GEO_PERSONA_SUMMARY_MAX_LENGTH,
} from "../constants/geo-personas";
import type {
  GeoGeneratedPersona,
  GeoPersonaGeneration,
} from "../types/geo-personas";

/**
 * Persona conversations reuse the prompt-keyed check tables, so their rows are
 * stored under a synthetic prompt id derived from the persona id.
 */
export function personaPromptId(personaId: string): string {
  return `${GEO_PERSONA_SCAN_ID_PREFIX}${personaId}`;
}

export function isPersonaScanPromptId(promptId: string): boolean {
  return promptId.startsWith(GEO_PERSONA_SCAN_ID_PREFIX);
}

function clip(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function clipList(values: readonly string[], maxLength: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clipped = clip(value, maxLength);
    const key = clipped.toLowerCase();
    if (clipped.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(clipped);
    if (result.length >= GEO_PERSONA_PROFILE_LIST_MAX) {
      break;
    }
  }
  return result;
}

/**
 * Enforces the product limits on a model-generated persona. The generation
 * schema is deliberately lenient so a list that runs one item long does not
 * fail the whole set; this is where lengths and counts are trimmed instead.
 */
export function normalizeGeneratedPersona(
  persona: GeoGeneratedPersona
): GeoGeneratedPersona {
  return {
    name: clip(persona.name, GEO_PERSONA_FIELD_MAX_LENGTH),
    role: clip(persona.role, GEO_PERSONA_FIELD_MAX_LENGTH),
    company: clip(persona.company, GEO_PERSONA_FIELD_MAX_LENGTH),
    summary: clip(persona.summary, GEO_PERSONA_SUMMARY_MAX_LENGTH),
    searchStyle: clip(persona.searchStyle, GEO_PERSONA_SUMMARY_MAX_LENGTH),
    goals: clipList(persona.goals, GEO_PERSONA_FIELD_MAX_LENGTH),
    painPoints: clipList(persona.painPoints, GEO_PERSONA_FIELD_MAX_LENGTH),
    currentStack: clipList(persona.currentStack, GEO_PERSONA_FIELD_MAX_LENGTH),
    buyingTriggers: clipList(
      persona.buyingTriggers,
      GEO_PERSONA_FIELD_MAX_LENGTH
    ),
    objections: clipList(persona.objections, GEO_PERSONA_FIELD_MAX_LENGTH),
    memories: persona.memories
      .map((memory) => ({
        kind: memory.kind,
        content: clip(memory.content, GEO_PERSONA_MEMORY_MAX_LENGTH),
      }))
      .filter((memory) => memory.content.length > 0)
      .slice(0, GEO_PERSONA_MAX_MEMORIES),
  };
}

export function normalizeGeneratedPersonaSet(
  generation: GeoPersonaGeneration
): GeoPersonaGeneration {
  return {
    personas: generation.personas
      .slice(0, GEO_PERSONA_MAX_COUNT)
      .map(normalizeGeneratedPersona),
  };
}
