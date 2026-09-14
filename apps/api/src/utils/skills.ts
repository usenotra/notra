import type {
  SkillUpstreamDetail,
  SkillUpstreamStatus,
  SystemSkillVersion,
} from "@notra/ai/skills/types";
import { Effect } from "effect";

import type { SkillDatabaseError } from "../errors/skills";
import type {
  SerializedSkill,
  SerializedSkillSummary,
  SkillDomainError,
  SkillTimestamps,
  SkillUpdatedAt,
} from "../types/skills";

/** Leave unexpected database errors to Hono's central error handler. */
export function runSkillProgram<A, E extends SkillDomainError>(
  program: Effect.Effect<A, E | SkillDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("SkillDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}

export function serializeSkill<T extends SkillTimestamps>(
  skill: T
): SerializedSkill<T> {
  return {
    ...skill,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

export function serializeSkillSummary<T extends SkillUpdatedAt>(
  skill: T
): SerializedSkillSummary<T> {
  return {
    ...skill,
    updatedAt: skill.updatedAt.toISOString(),
  };
}

/** Drops the full version rows: the API only exposes the derived status. */
export function toSkillUpstreamStatus(
  detail: SkillUpstreamDetail
): SkillUpstreamStatus {
  return {
    systemName: detail.systemName,
    baseVersion: detail.baseVersion,
    latestVersion: detail.latestVersion,
    isModified: detail.isModified,
    updateAvailable: detail.updateAvailable,
    changelog: detail.changelog,
  };
}

/** Catalog shape: metadata only, no content. */
export function serializeSystemSkill(version: SystemSkillVersion) {
  return {
    name: version.name,
    version: version.version,
    description: version.description,
    changelog: version.changelog,
    publishedAt: version.publishedAt.toISOString(),
  };
}

export function serializeSystemSkillDetail(version: SystemSkillVersion) {
  return {
    ...serializeSystemSkill(version),
    content: version.content,
  };
}
