import { GEO_PERSONA_MEMORY_SEARCH_LIMIT } from "@notra/ai/constants/geo-personas";
import {
  listPersonaMemoriesInputSchema,
  searchPersonaMemoriesInputSchema,
} from "@notra/ai/schemas/geo-personas";
import type { PersonaMemoryToolConfig } from "@notra/ai/types/geo-personas";
import { toolDescription } from "@notra/ai/utils/description";
import { searchPersonaMemories } from "@notra/ai/utils/persona-memory";
import { type Tool, tool } from "ai";

export function createListPersonaMemoriesTool(
  config: PersonaMemoryToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "listMemories",
      intro:
        "Lists everything you remember about yourself: your background, past experiences with tools, preferences, and constraints.",
      whenToUse:
        "At the start of a conversation to recall who you are, or when you want the full picture instead of a targeted lookup.",
      usageNotes:
        "Pass kind to narrow to one category. Memories are fixed; nothing you do here changes them.",
    }),
    inputSchema: listPersonaMemoriesInputSchema,
    execute: ({ kind }) => ({
      memories: config.memories
        .filter((memory) => !kind || memory.kind === kind)
        .map((memory) => ({ kind: memory.kind, content: memory.content })),
    }),
  });
}

export function createSearchPersonaMemoriesTool(
  config: PersonaMemoryToolConfig
): Tool {
  return tool({
    description: toolDescription({
      toolName: "searchMemories",
      intro:
        "Finds the memories most relevant to a topic, for example a tool you tried before or a problem you keep running into.",
      whenToUse:
        "Before asking a follow-up, to check what you already know or have experienced about the thing you are about to ask.",
      usageNotes: "Returns the closest matches ranked by relevance.",
    }),
    inputSchema: searchPersonaMemoriesInputSchema,
    execute: async ({ query }) => ({
      memories: (
        await searchPersonaMemories(
          config.personaId,
          config.memories,
          query,
          GEO_PERSONA_MEMORY_SEARCH_LIMIT
        )
      ).map((hit) => ({ kind: hit.kind, content: hit.content })),
    }),
  });
}
