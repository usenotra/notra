import { GEO_PERSONA_MEMORY_KINDS } from "@notra/db/constants/geo-personas";

import type { PersonaMemoryRecord } from "../types/geo-personas";

export function formatPersonaMemories(
  memories: readonly PersonaMemoryRecord[]
): string {
  if (memories.length === 0) {
    return "No additional memories.";
  }

  return GEO_PERSONA_MEMORY_KINDS.flatMap((kind) => {
    const entries = memories.filter((memory) => memory.kind === kind);
    return entries.length === 0
      ? []
      : [
          `### ${kind}\n${entries.map((memory) => `- ${memory.content.replaceAll("\n", "\n  ")}`).join("\n")}`,
        ];
  }).join("\n\n");
}
