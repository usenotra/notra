import { Schema } from "effect";

export class SkillNotFoundError extends Schema.TaggedError<SkillNotFoundError>()(
  "SkillNotFoundError",
  {}
) {}

export class SystemSkillDeleteError extends Schema.TaggedError<SystemSkillDeleteError>()(
  "SystemSkillDeleteError",
  {}
) {}

export class SkillDuplicateError extends Schema.TaggedError<SkillDuplicateError>()(
  "SkillDuplicateError",
  { name: Schema.String }
) {}

export class SkillDatabaseError extends Schema.TaggedError<SkillDatabaseError>()(
  "SkillDatabaseError",
  { cause: Schema.Defect() }
) {}

export class SkillNotSystemError extends Schema.TaggedError<SkillNotSystemError>()(
  "SkillNotSystemError",
  { name: Schema.String }
) {}

export class SystemSkillVersionNotFoundError extends Schema.TaggedError<SystemSkillVersionNotFoundError>()(
  "SystemSkillVersionNotFoundError",
  {}
) {}

export class SkillUpgradeInputError extends Schema.TaggedError<SkillUpgradeInputError>()(
  "SkillUpgradeInputError",
  { reason: Schema.String }
) {}
