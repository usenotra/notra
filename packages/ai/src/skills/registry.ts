import { db } from "@notra/db/drizzle";
import { systemSkillVersions } from "@notra/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  SYSTEM_SKILL_BACKFILL_BATCH_SIZE,
  SYSTEM_SKILL_PUBLISH_LOCK_KEY,
} from "./constants";
import { getSystemSkillDefinitions } from "./definitions";
import { computeSkillContentHash } from "./functions/hash";
import {
  isSystemSkillVersionPublished,
  nextSystemSkillVersion,
} from "./functions/versions";
import type {
  AutoUpgradeSystemSkillOptions,
  ClosestSystemSkillVersionInput,
  PublishedSystemSkill,
  PublishSystemSkillsResult,
  SkillRegistryDatabase,
  SystemSkillVersion,
} from "./types";

interface InsertedSystemSkillVersion extends PublishedSystemSkill {
  versionId: string;
}

const versionColumns = {
  id: systemSkillVersions.id,
  name: systemSkillVersions.name,
  version: systemSkillVersions.version,
  description: systemSkillVersions.description,
  content: systemSkillVersions.content,
  contentHash: systemSkillVersions.contentHash,
  changelog: systemSkillVersions.changelog,
  publishedAt: systemSkillVersions.publishedAt,
};

export async function getLatestSystemSkill(
  database: SkillRegistryDatabase,
  name: string
): Promise<SystemSkillVersion | null> {
  const [row] = await database
    .select(versionColumns)
    .from(systemSkillVersions)
    .where(eq(systemSkillVersions.name, name))
    .orderBy(desc(systemSkillVersions.version))
    .limit(1);

  return row ?? null;
}

/** The version an org copy is forked from, resolved by primary key. */
export async function getSystemSkillVersionById(
  database: SkillRegistryDatabase,
  id: string
): Promise<SystemSkillVersion | null> {
  const [row] = await database
    .select(versionColumns)
    .from(systemSkillVersions)
    .where(eq(systemSkillVersions.id, id))
    .limit(1);

  return row ?? null;
}

/** A specific published version, e.g. the base of a three-way merge. */
export async function getSystemSkillVersion(
  database: SkillRegistryDatabase,
  name: string,
  version: number
): Promise<SystemSkillVersion | null> {
  const [row] = await database
    .select(versionColumns)
    .from(systemSkillVersions)
    .where(
      and(
        eq(systemSkillVersions.name, name),
        eq(systemSkillVersions.version, version)
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Oldest published version of a name. The read model falls back to it when an
 * `is_system` row has no base yet, so a partial backfill cannot break the page.
 */
export async function getOldestSystemSkill(
  database: SkillRegistryDatabase,
  name: string
): Promise<SystemSkillVersion | null> {
  const [row] = await database
    .select(versionColumns)
    .from(systemSkillVersions)
    .where(eq(systemSkillVersions.name, name))
    .orderBy(asc(systemSkillVersions.version))
    .limit(1);

  return row ?? null;
}

/** Oldest published version per name, in one query. */
export async function listOldestSystemSkills(
  database: SkillRegistryDatabase
): Promise<SystemSkillVersion[]> {
  return await database
    .selectDistinctOn([systemSkillVersions.name], versionColumns)
    .from(systemSkillVersions)
    .orderBy(systemSkillVersions.name, asc(systemSkillVersions.version));
}

export async function listLatestSystemSkills(
  database: SkillRegistryDatabase
): Promise<SystemSkillVersion[]> {
  return await database
    .selectDistinctOn([systemSkillVersions.name], versionColumns)
    .from(systemSkillVersions)
    .orderBy(systemSkillVersions.name, desc(systemSkillVersions.version));
}

/**
 * The version one copy would be backfilled to: the one it matches byte for
 * byte, else the oldest published version of its name. `null` when the name
 * was never published.
 */
export async function findClosestSystemSkillVersion(
  database: SkillRegistryDatabase,
  copy: ClosestSystemSkillVersionInput
): Promise<SystemSkillVersion | null> {
  const [row] = await database
    .select(versionColumns)
    .from(systemSkillVersions)
    .where(eq(systemSkillVersions.name, copy.name))
    .orderBy(
      sql`(${systemSkillVersions.content} = ${copy.content} AND ${systemSkillVersions.description} = ${copy.description}) DESC`,
      asc(systemSkillVersions.version)
    )
    .limit(1);

  return row ?? null;
}

/**
 * Points every `is_system` skill row without a base at the registry version it
 * matches byte for byte, falling back to the oldest published version of that
 * name. Batched so a large tenant table never sits under one long lock.
 */
export async function backfillSystemSkillBases(
  database: SkillRegistryDatabase
): Promise<number> {
  let backfilled = 0;

  for (;;) {
    const result = await database.execute(sql`
      WITH candidates AS (
        SELECT
          s.id,
          (
            SELECT v.id
            FROM system_skill_versions v
            WHERE v.name = s.name
            ORDER BY
              (v.content = s.content AND v.description = s.description) DESC,
              v.version ASC
            LIMIT 1
          ) AS version_id
        FROM skills s
        WHERE s.is_system
          AND s.system_skill_version_id IS NULL
          AND EXISTS (
            SELECT 1 FROM system_skill_versions v WHERE v.name = s.name
          )
        LIMIT ${SYSTEM_SKILL_BACKFILL_BATCH_SIZE}
      )
      UPDATE skills s
      SET system_skill_version_id = c.version_id
      FROM candidates c
      WHERE s.id = c.id
    `);

    const affected = result.rowCount ?? 0;
    backfilled += affected;

    if (affected < SYSTEM_SKILL_BACKFILL_BATCH_SIZE) {
      return backfilled;
    }
  }
}

/**
 * Lifts every org copy that is still byte-equal to its base onto the new
 * version. Copies the user edited are left alone; they surface as `modified`.
 */
export async function autoUpgradeUnmodifiedSkills(
  database: SkillRegistryDatabase,
  options: AutoUpgradeSystemSkillOptions
): Promise<number> {
  const result = await database.execute(sql`
    UPDATE skills s
    SET content = published.content,
        description = published.description,
        system_skill_version_id = published.id
    FROM system_skill_versions base, system_skill_versions published
    WHERE s.is_system
      AND s.system_skill_version_id = base.id
      AND base.name = published.name
      AND base.name = ${options.name}
      AND published.id = ${options.newVersionId}
      AND s.content = base.content
      AND s.description = base.description
  `);

  return result.rowCount ?? 0;
}

/**
 * Publishes the code-defined skills into the global registry, then repairs and
 * upgrades org copies. Idempotent: a definition whose hash already sits at the
 * head of its name publishes nothing.
 */
export async function publishSystemSkills(
  database: SkillRegistryDatabase = db
): Promise<PublishSystemSkillsResult> {
  const definitions = getSystemSkillDefinitions();

  return await database.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${SYSTEM_SKILL_PUBLISH_LOCK_KEY}, 0))`
    );

    const inserted: InsertedSystemSkillVersion[] = [];

    for (const definition of definitions) {
      const contentHash = computeSkillContentHash(
        definition.description,
        definition.content
      );
      const latest = await getLatestSystemSkill(tx, definition.name);

      if (isSystemSkillVersionPublished(latest, contentHash)) {
        continue;
      }

      const [row] = await tx
        .insert(systemSkillVersions)
        .values({
          id: nanoid(),
          name: definition.name,
          version: nextSystemSkillVersion(latest),
          description: definition.description,
          content: definition.content,
          contentHash,
          changelog: definition.changelog ?? null,
        })
        .returning({
          id: systemSkillVersions.id,
          version: systemSkillVersions.version,
        });

      if (!row) {
        continue;
      }

      inserted.push({
        name: definition.name,
        version: row.version,
        versionId: row.id,
      });
    }

    // Runs before the upgrade so freshly backfilled rows can be lifted in the
    // same transaction, and unconditionally so a partial backfill self-heals.
    const backfilledRows = await backfillSystemSkillBases(tx);

    let upgradedRows = 0;
    for (const entry of inserted) {
      upgradedRows += await autoUpgradeUnmodifiedSkills(tx, {
        name: entry.name,
        newVersionId: entry.versionId,
      });
    }

    return {
      published: inserted.map((entry) => ({
        name: entry.name,
        version: entry.version,
      })),
      upgradedRows,
      backfilledRows,
    };
  });
}
