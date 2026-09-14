export const DEFAULT_SKILL_CATALOG_LIMIT = 20;
export const STANDALONE_SKILL_CATALOG_LIMIT = 30;
export const WHITESPACE_REGEX = /\s+/g;

/**
 * Advisory lock key for `publishSystemSkills`, so an API boot and the
 * dashboard cron can never publish the same version twice.
 */
export const SYSTEM_SKILL_PUBLISH_LOCK_KEY = "system-skills:publish";
export const FIRST_SYSTEM_SKILL_VERSION = 1;
export const SYSTEM_SKILL_BACKFILL_BATCH_SIZE = 500;
export const HUMANIZER_SKILL_NAME = "humanizer";

/**
 * How an org copy of a system skill is lifted onto the latest published
 * version. `discard` takes upstream, `keep` only re-bases the fork, `merge`
 * stores the text the client resolved.
 */
export const SKILL_UPGRADE_STRATEGIES = ["discard", "keep", "merge"] as const;
