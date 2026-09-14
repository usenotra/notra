import { SkillPersistenceError } from "@notra/ai/skills/errors";
import {
  getSkillUpstream,
  listSkillUpstreamStatuses,
  updateSkillContent,
  upgradeSkill as upgradeSkillContent,
} from "@notra/ai/skills/functions/upstream";
import {
  getLatestSystemSkill,
  getSystemSkillVersion as findSystemSkillVersion,
  listLatestSystemSkills,
} from "@notra/ai/skills/registry";
import { skills } from "@notra/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { nanoid } from "nanoid";

import {
  SkillDatabaseError,
  SkillDuplicateError,
  SkillNotFoundError,
  SystemSkillDeleteError,
  SystemSkillVersionNotFoundError,
} from "../errors/skills";
import type {
  CreateSkillProgramInput,
  NamedSkillProgramInput,
  NamedSystemSkillProgramInput,
  PatchSkillProgramInput,
  SkillProgramInput,
  SystemSkillProgramInput,
  SystemSkillVersionProgramInput,
  UpgradeSkillProgramInput,
} from "../types/skills";
import { isPgUniqueViolation } from "../utils/pg-errors";
import { mapSkillServiceError } from "../utils/skill-errors";
import { toSkillUpstreamStatus } from "../utils/skills";

const database = <A>(operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) => new SkillDatabaseError({ cause }),
  });

const write = <A>(name: string, operation: () => Promise<A>) =>
  Effect.tryPromise({
    try: operation,
    catch: (cause) =>
      isPgUniqueViolation(cause)
        ? new SkillDuplicateError({ name })
        : new SkillDatabaseError({ cause }),
  });

export const listSkills = Effect.fn("skills.list")(function* ({
  db,
  organizationId,
}: SkillProgramInput) {
  const [rows, upstreamById] = yield* Effect.all([
    database(() =>
      db
        .select({
          id: skills.id,
          name: skills.name,
          description: skills.description,
          isSystem: skills.isSystem,
          updatedAt: skills.updatedAt,
        })
        .from(skills)
        .where(eq(skills.organizationId, organizationId))
        .orderBy(asc(skills.name))
    ),
    listSkillUpstreamStatuses({ organizationId, database: db }).pipe(
      Effect.mapError(mapSkillServiceError)
    ),
  ]);

  return rows.map((row) => ({
    ...row,
    upstream: upstreamById.get(row.id) ?? null,
  }));
});

export const getSkill = Effect.fn("skills.get")(function* ({
  db,
  organizationId,
  name,
}: NamedSkillProgramInput) {
  const skill = yield* database(() =>
    db.query.skills.findFirst({
      where: and(
        eq(skills.organizationId, organizationId),
        eq(skills.name, name)
      ),
    })
  );
  if (!skill) {
    return yield* new SkillNotFoundError();
  }

  const upstream = yield* getSkillUpstream(
    { organizationId, database: db },
    { id: skill.id }
  ).pipe(Effect.mapError(mapSkillServiceError));

  return {
    ...skill,
    upstream: upstream ? toSkillUpstreamStatus(upstream) : null,
  };
});

export const createSkill = Effect.fn("skills.create")(function* ({
  db,
  organizationId,
  body,
}: CreateSkillProgramInput) {
  const [created] = yield* write(body.name, () =>
    db
      .insert(skills)
      .values({
        id: nanoid(),
        organizationId,
        name: body.name,
        description: body.description,
        content: body.content,
        isSystem: false,
      })
      .returning()
  );
  if (!created) {
    return yield* new SkillDatabaseError({
      cause: new Error("Failed to create skill"),
    });
  }

  // Created skills are always custom, so they have no upstream version.
  return { ...created, upstream: null };
});

export const patchSkill = Effect.fn("skills.patch")(function* ({
  db,
  organizationId,
  name,
  body,
}: PatchSkillProgramInput) {
  // The shared write path also covers system skill renames, which pin a base
  // version first so the copy keeps following its registry name.
  const { id } = yield* updateSkillContent(
    { organizationId, database: db },
    { name },
    body
  ).pipe(
    Effect.mapError((cause) =>
      cause instanceof SkillPersistenceError && isPgUniqueViolation(cause.cause)
        ? new SkillDuplicateError({ name: body.name ?? name })
        : mapSkillServiceError(cause)
    )
  );

  const updated = yield* database(() =>
    db.query.skills.findFirst({
      where: and(eq(skills.organizationId, organizationId), eq(skills.id, id)),
    })
  );
  if (!updated) {
    return yield* new SkillNotFoundError();
  }

  const upstream = yield* getSkillUpstream(
    { organizationId, database: db },
    { id }
  ).pipe(Effect.mapError(mapSkillServiceError));

  return {
    ...updated,
    upstream: upstream ? toSkillUpstreamStatus(upstream) : null,
  };
});

export const deleteSkill = Effect.fn("skills.delete")(function* ({
  db,
  organizationId,
  name,
}: NamedSkillProgramInput) {
  const existing = yield* database(() =>
    db.query.skills.findFirst({
      where: and(
        eq(skills.organizationId, organizationId),
        eq(skills.name, name)
      ),
      columns: { id: true, isSystem: true },
    })
  );
  if (!existing) {
    return yield* new SkillNotFoundError();
  }
  if (existing.isSystem) {
    return yield* new SystemSkillDeleteError();
  }

  yield* database(() =>
    db
      .delete(skills)
      .where(
        and(eq(skills.organizationId, organizationId), eq(skills.name, name))
      )
  );
});

/**
 * The single write path for upgrades. Service-level validation is a safety net:
 * `upgradeSkillRequestSchema` already rejects a `merge` without content with a
 * 400 before the program runs.
 */
export const upgradeSkill = Effect.fn("skills.upgrade")(function* ({
  db,
  organizationId,
  name,
  body,
}: UpgradeSkillProgramInput) {
  return yield* upgradeSkillContent(
    { organizationId, database: db },
    { name },
    body
  ).pipe(Effect.mapError(mapSkillServiceError));
});

export const listSystemSkills = Effect.fn("system-skills.list")(function* ({
  db,
}: SystemSkillProgramInput) {
  return yield* database(() => listLatestSystemSkills(db));
});

export const getSystemSkill = Effect.fn("system-skills.get")(function* ({
  db,
  name,
}: NamedSystemSkillProgramInput) {
  const version = yield* database(() => getLatestSystemSkill(db, name));
  return version ?? (yield* new SystemSkillVersionNotFoundError());
});

export const getSystemSkillVersion = Effect.fn("system-skills.get-version")(
  function* ({ db, name, version }: SystemSkillVersionProgramInput) {
    const row = yield* database(() =>
      findSystemSkillVersion(db, name, version)
    );
    return row ?? (yield* new SystemSkillVersionNotFoundError());
  }
);
