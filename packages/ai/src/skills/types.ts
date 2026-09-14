import type { db } from "@notra/db/drizzle";

import type { SKILL_UPGRADE_STRATEGIES } from "./constants";

export interface SkillSummary {
  name: string;
  description: string;
}

export interface SkillContent extends SkillSummary {
  content: string;
}

export interface SkillServiceContext {
  organizationId: string;
}

export interface ListSkillsOptions {
  limit?: number;
  offset?: number;
}

export interface SystemSkillDefinition extends SkillContent {
  /** Optional "what's new" line stored with the published version. */
  changelog?: string;
}

export interface SystemSkillVersion extends SkillContent {
  id: string;
  version: number;
  contentHash: string;
  changelog: string | null;
  publishedAt: Date;
}

export interface PublishedSystemSkill {
  name: string;
  version: number;
}

export interface PublishSystemSkillsResult {
  published: PublishedSystemSkill[];
  upgradedRows: number;
  backfilledRows: number;
}

export interface AutoUpgradeSystemSkillOptions {
  name: string;
  newVersionId: string;
}

export type SkillRegistryTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type SkillRegistryDatabase = typeof db | SkillRegistryTransaction;

/** How a fork is lifted onto the latest published version. See `SKILL_UPGRADE_STRATEGIES`. */
export type SkillUpgradeStrategy = (typeof SKILL_UPGRADE_STRATEGIES)[number];

/**
 * Read model for one org copy of a system skill. `null` for custom skills:
 * they have no upstream to compare against.
 */
export interface SkillUpstreamStatus {
  /**
   * Registry name the copy tracks. Equals the skill name until the user renames
   * it; updates keep following this name either way.
   */
  systemName: string;
  /** Version the org copy was forked from. */
  baseVersion: number;
  /** Newest published version of the same name. */
  latestVersion: number;
  /** Derived, never stored: the copy no longer matches its base byte for byte. */
  isModified: boolean;
  updateAvailable: boolean;
  /** Changelog of the latest version, for the update panel. */
  changelog: string | null;
}

/** `SkillUpstreamStatus` plus both full version rows, for diff and merge UIs. */
export interface SkillUpstreamDetail extends SkillUpstreamStatus {
  base: SystemSkillVersion;
  latest: SystemSkillVersion;
}

/** The org copy as `deriveSkillUpstreamStatus` needs to see it. */
export interface SkillUpstreamSubject {
  description: string;
  content: string;
  /** Null on an `is_system` row only while a backfill is still incomplete. */
  systemSkillVersionId: string | null;
}

/** The parts of a published version the status derivation reads. */
export interface SkillUpstreamBase {
  version: number;
  description: string;
  content: string;
}

export interface SkillUpstreamLatest extends SkillUpstreamBase {
  name: string;
  changelog: string | null;
}

export interface DeriveSkillUpstreamStatusInput {
  skill: SkillUpstreamSubject;
  base: SkillUpstreamBase;
  latest: SkillUpstreamLatest;
}

/**
 * Service context for the skill read model and write paths. `database` lets the
 * public API pass its request-scoped client; everything else uses the shared one.
 */
export interface SkillUpstreamContext extends SkillServiceContext {
  database?: SkillRegistryDatabase;
}

/**
 * How a write path finds the org row. The dashboard addresses skills by id so a
 * rename never changes its URL; the public API and agent tools go by name.
 */
export type SkillLookup = { id: string } | { name: string };

export interface UpdateSkillContentResult {
  id: string;
  name: string;
}

/** Input for pinning a base onto a copy that has none yet. */
export interface ClosestSystemSkillVersionInput {
  name: string;
  description: string;
  content: string;
}

/** Omitted fields keep their current value. */
export interface UpdateSkillContentInput {
  name?: string;
  description?: string;
  content?: string;
}

export interface UpgradeSkillInput {
  strategy: SkillUpgradeStrategy;
  /** Required for `merge`: the text the client resolved. */
  content?: string;
  /** Falls back to the latest version's description. */
  description?: string;
}

export interface UpgradeSkillResult {
  name: string;
  version: number;
}
