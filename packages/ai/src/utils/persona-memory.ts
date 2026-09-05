import { Index } from "@upstash/vector";

import {
  GEO_PERSONA_VECTOR_ID_SEPARATOR,
  GEO_PERSONA_VECTOR_TOKEN_ENV,
  GEO_PERSONA_VECTOR_UPSERT_CHUNK,
  GEO_PERSONA_VECTOR_URL_ENV,
} from "../constants/geo-personas";
import type {
  PersonaMemoryHit,
  PersonaMemoryRecord,
  PersonaVectorMetadata,
} from "../types/geo-personas";

const WORD_SPLIT_REGEX = /[^\p{L}\p{N}]+/u;
const MIN_KEYWORD_LENGTH = 3;

let cachedIndex: Index<PersonaVectorMetadata> | null | undefined;

/**
 * Lazily builds the Upstash Vector client. Returns null when the env is not
 * configured so callers can fall back to the in-memory keyword search and the
 * scan keeps working in local setups without a vector index.
 */
export function getPersonaVectorIndex(): Index<PersonaVectorMetadata> | null {
  if (cachedIndex !== undefined) {
    return cachedIndex;
  }
  const url = process.env[GEO_PERSONA_VECTOR_URL_ENV]?.trim();
  const token = process.env[GEO_PERSONA_VECTOR_TOKEN_ENV]?.trim();
  cachedIndex =
    url && token ? new Index<PersonaVectorMetadata>({ url, token }) : null;
  return cachedIndex;
}

export function personaVectorId(personaId: string, memoryId: string): string {
  return `${personaId}${GEO_PERSONA_VECTOR_ID_SEPARATOR}${memoryId}`;
}

function personaVectorPrefix(personaId: string): string {
  return `${personaId}${GEO_PERSONA_VECTOR_ID_SEPARATOR}`;
}

function personaFilter(personaId: string): string {
  return `personaId = '${personaId.replaceAll("'", "")}'`;
}

/** Returns false when no vector index is configured; the rows still live in Postgres. */
export async function upsertPersonaMemories(
  memories: readonly PersonaMemoryRecord[]
): Promise<boolean> {
  const index = getPersonaVectorIndex();
  if (!index || memories.length === 0) {
    return false;
  }
  for (
    let offset = 0;
    offset < memories.length;
    offset += GEO_PERSONA_VECTOR_UPSERT_CHUNK
  ) {
    const chunk = memories.slice(
      offset,
      offset + GEO_PERSONA_VECTOR_UPSERT_CHUNK
    );
    await index.upsert(
      chunk.map((memory) => ({
        id: personaVectorId(memory.personaId, memory.id),
        data: memory.content,
        metadata: {
          personaId: memory.personaId,
          projectId: memory.projectId,
          kind: memory.kind,
        },
      }))
    );
  }
  return true;
}

export async function deletePersonaMemories(personaId: string): Promise<void> {
  const index = getPersonaVectorIndex();
  if (!index) {
    return;
  }
  await index.delete({ prefix: personaVectorPrefix(personaId) });
}

export async function searchPersonaMemoriesVector(
  personaId: string,
  query: string,
  limit: number
): Promise<PersonaMemoryHit[] | null> {
  const index = getPersonaVectorIndex();
  if (!index) {
    return null;
  }
  const results = await index.query({
    data: query,
    topK: limit,
    filter: personaFilter(personaId),
    includeMetadata: true,
    includeData: true,
  });
  return results.flatMap((result) => {
    const content = result.data?.trim();
    if (!content) {
      return [];
    }
    return [
      {
        id: String(result.id),
        kind: result.metadata?.kind ?? null,
        content,
        score: result.score,
      },
    ];
  });
}

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(WORD_SPLIT_REGEX)
      .filter((word) => word.length >= MIN_KEYWORD_LENGTH)
  );
}

/** Keyword overlap ranking used when no vector index is configured. */
export function searchPersonaMemoriesKeyword(
  memories: readonly PersonaMemoryRecord[],
  query: string,
  limit: number
): PersonaMemoryHit[] {
  const terms = keywords(query);
  if (terms.size === 0) {
    return [];
  }
  const scored = memories.flatMap((memory) => {
    const words = keywords(memory.content);
    let overlap = 0;
    for (const term of terms) {
      if (words.has(term)) {
        overlap += 1;
      }
    }
    if (overlap === 0) {
      return [];
    }
    return [
      {
        id: memory.id,
        kind: memory.kind,
        content: memory.content,
        score: overlap / terms.size,
      },
    ];
  });
  return scored.sort((left, right) => right.score - left.score).slice(0, limit);
}

export async function searchPersonaMemories(
  personaId: string,
  memories: readonly PersonaMemoryRecord[],
  query: string,
  limit: number
): Promise<PersonaMemoryHit[]> {
  let hits: PersonaMemoryHit[] | null = null;
  try {
    hits = await searchPersonaMemoriesVector(personaId, query, limit);
  } catch (error) {
    // A vector outage must not break the persona turn; the memories are in
    // Postgres anyway, so keyword ranking keeps the conversation going.
    console.error("[GEO] persona vector search failed:", error);
  }
  return hits ?? searchPersonaMemoriesKeyword(memories, query, limit);
}
