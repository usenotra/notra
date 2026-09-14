import { createHash } from "node:crypto";

/**
 * Identity of a published system skill version. Must stay byte-stable: the
 * registry deduplicates republishes on `(name, content_hash)`.
 */
export function computeSkillContentHash(
  description: string,
  content: string
): string {
  return createHash("sha256")
    .update(`${description}\n${content}`)
    .digest("hex");
}
