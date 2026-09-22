import { createHash } from "node:crypto";

import type { GeoPersonaSnapshotV2 } from "../types/geo-personas";

export function createPersonaSnapshot(
  persona: GeoPersonaSnapshotV2["persona"],
  memories: readonly GeoPersonaSnapshotV2["memories"][number][],
  conversationPrompts: readonly string[]
): GeoPersonaSnapshotV2 {
  const context = {
    persona: {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      company: persona.company,
      summary: persona.summary,
      searchStyle: persona.searchStyle,
      profile: structuredClone(persona.profile),
    },
    memories: memories.map(({ id, kind, content }) => ({ id, kind, content })),
    conversationPrompts: [...conversationPrompts],
  } satisfies Omit<GeoPersonaSnapshotV2, "schemaVersion" | "version">;

  return {
    schemaVersion: 2,
    version: createHash("sha256").update(JSON.stringify(context)).digest("hex"),
    ...context,
  };
}
