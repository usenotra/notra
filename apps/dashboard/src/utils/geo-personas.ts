import { Avatar, Style } from "@dicebear/core";
import personasStyle from "@dicebear/styles/personas.json";
import type { GeoSequenceTurnResult } from "@notra/geo-core/types/geo";
import type {
  GeoPersonaMemory,
  GeoPersonaTurnResult,
} from "@notra/geo-core/types/geo-personas";

import {
  GEO_PERSONA_AVATAR_BACKGROUNDS,
  GEO_PERSONA_AVATAR_SIZE,
  GEO_PERSONA_MEMORY_KIND_LABELS,
  GEO_PERSONA_MEMORY_KIND_ORDER,
  GEO_PERSONA_SENTENCE_SEGMENTER,
} from "@/constants/geo-personas";
import type { GeoSequenceEngineThread } from "@/types/geo";
import type { PersonaMemoryGroup } from "@/types/geo-personas-ui";
import { buildSequenceEngineThreads } from "@/utils/geo-sequences";

/**
 * A persona turn carries the same shape as a conversation turn apart from the
 * owning id, so it can be replayed by the conversation components unchanged.
 */
function toSequenceTurn(result: GeoPersonaTurnResult): GeoSequenceTurnResult {
  const { personaId, ...turn } = result;
  return { ...turn, sequenceId: personaId };
}

export function toPersonaEngineThreads(
  results: readonly GeoPersonaTurnResult[],
  personaId: string | undefined
): GeoSequenceEngineThread[] {
  return buildSequenceEngineThreads(results.map(toSequenceTurn), personaId);
}

export function groupPersonaMemories(
  memories: readonly GeoPersonaMemory[]
): PersonaMemoryGroup[] {
  const groups: PersonaMemoryGroup[] = [];
  for (const kind of GEO_PERSONA_MEMORY_KIND_ORDER) {
    const matching = memories.filter((memory) => memory.kind === kind);
    if (matching.length > 0) {
      groups.push({
        kind,
        label: GEO_PERSONA_MEMORY_KIND_LABELS[kind],
        memories: matching,
      });
    }
  }
  return groups;
}

const personaAvatarStyle = new Style(personasStyle);

/** Deterministic illustrated portrait for a persona, keyed by its id. */
export function personaAvatarDataUri(seed: string): string {
  return new Avatar(personaAvatarStyle, {
    seed,
    size: GEO_PERSONA_AVATAR_SIZE,
    backgroundColor: [...GEO_PERSONA_AVATAR_BACKGROUNDS],
  }).toDataUri();
}

export function personaInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function personaProfilePoints(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s+/, "").trim())
    .filter(Boolean)
    .flatMap((line) =>
      Array.from(GEO_PERSONA_SENTENCE_SEGMENTER.segment(line), ({ segment }) =>
        segment.trim()
      )
    );
}
