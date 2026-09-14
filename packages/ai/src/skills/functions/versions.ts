import { FIRST_SYSTEM_SKILL_VERSION } from "../constants";

/**
 * Versions are per name and monotonic, so the next one is always the head plus
 * one. `null` means the name has never been published.
 */
export function nextSystemSkillVersion(
  latest: { version: number } | null
): number {
  if (!latest) {
    return FIRST_SYSTEM_SKILL_VERSION;
  }

  return latest.version + 1;
}

/** A published version is reusable only when the exact bytes already exist. */
export function isSystemSkillVersionPublished(
  latest: { contentHash: string } | null,
  contentHash: string
): boolean {
  return latest?.contentHash === contentHash;
}
