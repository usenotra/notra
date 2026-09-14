/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class SkillNotFoundError extends Schema.TaggedError<SkillNotFoundError>()(
  "SkillNotFoundError",
  { skillName: Schema.String }
) {
  override get message() {
    return `Skill "${this.skillName}" does not exist in this organization`;
  }
}

export class SkillDuplicateError extends Schema.TaggedError<SkillDuplicateError>()(
  "SkillDuplicateError",
  { skillName: Schema.String }
) {
  override get message() {
    return `A skill named "${this.skillName}" already exists`;
  }
}

/** Upgrades only apply to system skills; a custom skill has no upstream. */
export class SkillNotSystemError extends Schema.TaggedError<SkillNotSystemError>()(
  "SkillNotSystemError",
  { skillName: Schema.String }
) {
  override get message() {
    return `Skill "${this.skillName}" is not a system skill`;
  }
}

/** The registry has no published version of this name yet. */
export class SystemSkillVersionMissingError extends Schema.TaggedError<SystemSkillVersionMissingError>()(
  "SystemSkillVersionMissingError",
  { skillName: Schema.String }
) {
  override get message() {
    return `No published version exists for skill "${this.skillName}"`;
  }
}

/** The upgrade payload does not satisfy the chosen strategy. */
export class SkillUpgradeInputError extends Schema.TaggedError<SkillUpgradeInputError>()(
  "SkillUpgradeInputError",
  { skillName: Schema.String, reason: Schema.String }
) {
  override get message() {
    return this.reason;
  }
}

export class SkillPersistenceError extends Schema.TaggedError<SkillPersistenceError>()(
  "SkillPersistenceError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}
