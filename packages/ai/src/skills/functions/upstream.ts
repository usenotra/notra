import { db } from "@notra/db/drizzle";
import { skills, systemSkillVersions } from "@notra/db/schema";
import { aliasedTable, and, eq } from "drizzle-orm";
import { Effect } from "effect";

import {
  SkillDuplicateError,
  SkillNotFoundError,
  SkillNotSystemError,
  SkillPersistenceError,
  SkillUpgradeInputError,
  SystemSkillVersionMissingError,
} from "../errors";
import {
  findClosestSystemSkillVersion,
  getLatestSystemSkill,
  getOldestSystemSkill,
  getSystemSkillVersionById,
  listLatestSystemSkills,
  listOldestSystemSkills,
} from "../registry";
import type {
  DeriveSkillUpstreamStatusInput,
  SkillLookup,
  SkillRegistryDatabase,
  SkillUpstreamBase,
  SkillUpstreamContext,
  SkillUpstreamDetail,
  SkillUpstreamStatus,
  SystemSkillVersion,
  UpdateSkillContentInput,
  UpdateSkillContentResult,
  UpgradeSkillInput,
  UpgradeSkillResult,
} from "../types";

const baseVersions = aliasedTable(systemSkillVersions, "base_version");

interface JoinedBaseColumns {
  baseVersion: number | null;
  baseDescription: string | null;
  baseContent: string | null;
}

function resolveDatabase(ctx: SkillUpstreamContext): SkillRegistryDatabase {
  return ctx.database ?? db;
}

function database<A>(operation: string, run: () => Promise<A>) {
  return Effect.tryPromise({
    try: run,
    catch: (cause) => new SkillPersistenceError({ operation, cause }),
  });
}

function skillLookupWhere(ctx: SkillUpstreamContext, lookup: SkillLookup) {
  return and(
    eq(skills.organizationId, ctx.organizationId),
    "id" in lookup ? eq(skills.id, lookup.id) : eq(skills.name, lookup.name)
  );
}

function describeSkillLookup(lookup: SkillLookup): string {
  return "id" in lookup ? lookup.id : lookup.name;
}

/**
 * The registry name an org copy follows. Its base version carries it, so a
 * renamed copy keeps receiving updates. Only a row the backfill has not pinned
 * yet falls back to its own name; renames always pin a base first.
 */
function resolveSystemName(row: {
  name: string;
  baseName: string | null;
}): string {
  return row.baseName ?? row.name;
}

/**
 * The four states of section 2 of the plan, derived rather than stored.
 *
 * `base` is the version the org copy was forked from. When an `is_system` row
 * still has `system_skill_version_id = NULL` (a backfill that has not caught up
 * yet), callers pass the LOWEST published version of that name instead, which
 * makes the copy read as `modified` and lets the user resolve it by hand.
 */
export function deriveSkillUpstreamStatus({
  skill,
  base,
  latest,
}: DeriveSkillUpstreamStatusInput): SkillUpstreamStatus {
  return {
    systemName: latest.name,
    baseVersion: base.version,
    latestVersion: latest.version,
    isModified:
      skill.content !== base.content || skill.description !== base.description,
    updateAvailable: latest.version > base.version,
    changelog: latest.changelog,
  };
}

/**
 * Base and latest version of one org copy, with full content for the diff and
 * merge UIs. `null` for custom skills, unknown skills, and system skills whose
 * registry name has never been published.
 */
export const getSkillUpstream = Effect.fn("SkillUpstream.get")(function* (
  ctx: SkillUpstreamContext,
  lookup: SkillLookup
) {
  const databaseClient = resolveDatabase(ctx);

  const [skill] = yield* database("SkillUpstream.get.skill", () =>
    databaseClient
      .select({
        name: skills.name,
        description: skills.description,
        content: skills.content,
        isSystem: skills.isSystem,
        systemSkillVersionId: skills.systemSkillVersionId,
        baseName: baseVersions.name,
      })
      .from(skills)
      .leftJoin(baseVersions, eq(skills.systemSkillVersionId, baseVersions.id))
      .where(skillLookupWhere(ctx, lookup))
      .limit(1)
  );

  if (!skill?.isSystem) {
    return null;
  }

  const systemName = resolveSystemName(skill);
  const latest = yield* database("SkillUpstream.get.latest", () =>
    getLatestSystemSkill(databaseClient, systemName)
  );
  if (!latest) {
    return null;
  }

  const base = yield* database("SkillUpstream.get.base", () =>
    skill.systemSkillVersionId
      ? getSystemSkillVersionById(databaseClient, skill.systemSkillVersionId)
      : getOldestSystemSkill(databaseClient, systemName)
  );
  const resolvedBase = base ?? latest;

  return {
    ...deriveSkillUpstreamStatus({ skill, base: resolvedBase, latest }),
    base: resolvedBase,
    latest,
  } satisfies SkillUpstreamDetail;
});

/**
 * Upstream status of every system skill in the organization, keyed by skill
 * id so a renamed copy still finds its status. Custom skills are absent from
 * the map; callers serialize them as `upstream: null`.
 *
 * Three queries at most, never one per skill: the org rows joined to their base
 * version, the latest version per name, and — only when a row has no base yet —
 * the oldest version per name.
 */
export const listSkillUpstreamStatuses = Effect.fn(
  "SkillUpstream.listStatuses"
)(function* (ctx: SkillUpstreamContext) {
  const databaseClient = resolveDatabase(ctx);

  const [rows, latestVersions] = yield* Effect.all([
    database("SkillUpstream.listStatuses.skills", () =>
      databaseClient
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          content: skills.content,
          systemSkillVersionId: skills.systemSkillVersionId,
          baseName: baseVersions.name,
          baseVersion: baseVersions.version,
          baseDescription: baseVersions.description,
          baseContent: baseVersions.content,
        })
        .from(skills)
        .leftJoin(
          baseVersions,
          eq(skills.systemSkillVersionId, baseVersions.id)
        )
        .where(
          and(
            eq(skills.organizationId, ctx.organizationId),
            eq(skills.isSystem, true)
          )
        )
    ),
    database("SkillUpstream.listStatuses.latest", () =>
      listLatestSystemSkills(databaseClient)
    ),
  ]);

  const latestByName = new Map(
    latestVersions.map((version) => [version.name, version])
  );
  const needsFallbackBase = rows.some((row) => row.baseVersion === null);
  const oldestVersions = needsFallbackBase
    ? yield* database("SkillUpstream.listStatuses.oldest", () =>
        listOldestSystemSkills(databaseClient)
      )
    : [];
  const oldestByName = new Map(
    oldestVersions.map((version) => [version.name, version])
  );

  const statuses = new Map<string, SkillUpstreamStatus>();

  for (const row of rows) {
    const systemName = resolveSystemName(row);
    const latest = latestByName.get(systemName);
    if (!latest) {
      continue;
    }

    statuses.set(
      row.id,
      deriveSkillUpstreamStatus({
        skill: row,
        base: resolveJoinedBase(row, oldestByName.get(systemName) ?? latest),
        latest,
      })
    );
  }

  return statuses;
});

/**
 * The joined base columns are nullable together: a row whose backfill has not
 * run yet falls back to the oldest published version of its name.
 */
function resolveJoinedBase(
  row: JoinedBaseColumns,
  fallback: SkillUpstreamBase
): SkillUpstreamBase {
  if (
    row.baseVersion === null ||
    row.baseDescription === null ||
    row.baseContent === null
  ) {
    return fallback;
  }

  return {
    version: row.baseVersion,
    description: row.baseDescription,
    content: row.baseContent,
  };
}

/**
 * The single write path for skill text, shared by the dashboard router, the
 * public API and the agent tool. Omitted fields keep their current value.
 *
 * System skills can be renamed: their link to the registry is the base
 * version, not the name. A copy without a base yet gets one pinned before the
 * rename, the same way the backfill would, so it never loses its upstream.
 */
export const updateSkillContent = Effect.fn("SkillUpstream.updateContent")(
  function* (
    ctx: SkillUpstreamContext,
    lookup: SkillLookup,
    input: UpdateSkillContentInput
  ) {
    const databaseClient = resolveDatabase(ctx);

    const [existing] = yield* database("SkillUpstream.updateContent.find", () =>
      databaseClient
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          content: skills.content,
          isSystem: skills.isSystem,
          systemSkillVersionId: skills.systemSkillVersionId,
        })
        .from(skills)
        .where(skillLookupWhere(ctx, lookup))
        .limit(1)
    );

    if (!existing) {
      return yield* new SkillNotFoundError({
        skillName: describeSkillLookup(lookup),
      });
    }

    const nextName = input.name ?? existing.name;
    const isRename = nextName !== existing.name;

    if (isRename) {
      const [conflict] = yield* database(
        "SkillUpstream.updateContent.conflict",
        () =>
          databaseClient
            .select({ id: skills.id })
            .from(skills)
            .where(
              and(
                eq(skills.organizationId, ctx.organizationId),
                eq(skills.name, nextName)
              )
            )
            .limit(1)
      );

      if (conflict) {
        return yield* new SkillDuplicateError({ skillName: nextName });
      }
    }

    const pinnedBase =
      isRename && existing.isSystem && !existing.systemSkillVersionId
        ? yield* database("SkillUpstream.updateContent.pinBase", () =>
            findClosestSystemSkillVersion(databaseClient, existing)
          )
        : null;

    yield* database("SkillUpstream.updateContent.write", () =>
      databaseClient
        .update(skills)
        .set({
          name: nextName,
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(input.content === undefined ? {} : { content: input.content }),
          ...(pinnedBase ? { systemSkillVersionId: pinnedBase.id } : {}),
        })
        .where(eq(skills.id, existing.id))
    );

    return {
      id: existing.id,
      name: nextName,
    } satisfies UpdateSkillContentResult;
  }
);

/**
 * Lifts an org copy of a system skill onto the latest published version of the
 * registry name it follows. See `SKILL_UPGRADE_STRATEGIES` for what each
 * strategy does with the text; all three set the base to the latest version.
 */
export const upgradeSkill = Effect.fn("SkillUpstream.upgrade")(function* (
  ctx: SkillUpstreamContext,
  lookup: SkillLookup,
  input: UpgradeSkillInput
) {
  const databaseClient = resolveDatabase(ctx);

  const [existing] = yield* database("SkillUpstream.upgrade.find", () =>
    databaseClient
      .select({
        id: skills.id,
        name: skills.name,
        isSystem: skills.isSystem,
        baseName: baseVersions.name,
      })
      .from(skills)
      .leftJoin(baseVersions, eq(skills.systemSkillVersionId, baseVersions.id))
      .where(skillLookupWhere(ctx, lookup))
      .limit(1)
  );

  if (!existing) {
    return yield* new SkillNotFoundError({
      skillName: describeSkillLookup(lookup),
    });
  }

  if (!existing.isSystem) {
    return yield* new SkillNotSystemError({ skillName: existing.name });
  }

  const latest = yield* database("SkillUpstream.upgrade.latest", () =>
    getLatestSystemSkill(databaseClient, resolveSystemName(existing))
  );
  if (!latest) {
    return yield* new SystemSkillVersionMissingError({
      skillName: existing.name,
    });
  }

  let values: { content?: string; description?: string };
  if (input.strategy === "discard") {
    values = { content: latest.content, description: latest.description };
  } else if (input.strategy === "keep") {
    // Re-base without touching the text: the user consciously stays on their
    // version and the update badge disappears.
    values = {};
  } else {
    if (!input.content?.trim()) {
      return yield* new SkillUpgradeInputError({
        skillName: existing.name,
        reason: 'The "merge" strategy requires the merged content',
      });
    }
    values = {
      content: input.content,
      description: input.description ?? latest.description,
    };
  }

  yield* database("SkillUpstream.upgrade.write", () =>
    databaseClient
      .update(skills)
      .set({ ...values, systemSkillVersionId: latest.id })
      .where(eq(skills.id, existing.id))
  );

  return {
    name: existing.name,
    version: latest.version,
  } satisfies UpgradeSkillResult;
});
