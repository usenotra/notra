import { createHash } from "node:crypto";

import type { GeoPersonaSnapshotV2 } from "@notra/db/types/geo-personas";

import type { GeoPersonaMemory } from "../types/geo-personas";

export function createPersonaSnapshot(
  persona: GeoPersonaSnapshotV2["persona"],
  memories: readonly GeoPersonaMemory[],
  conversationPrompts: readonly string[]
): GeoPersonaSnapshotV2 {
  const context = {
    persona: structuredClone(persona),
    memories: memories.map(({ id, kind, content }) => ({ id, kind, content })),
    conversationPrompts: [...conversationPrompts],
  } satisfies Omit<GeoPersonaSnapshotV2, "schemaVersion" | "version">;

  return {
    schemaVersion: 2,
    version: createHash("sha256").update(JSON.stringify(context)).digest("hex"),
    ...context,
  };
}
