import { Schema } from "effect";

export class SkillNotFoundError extends Schema.TaggedError<SkillNotFoundError>()(
  "SkillNotFoundError",
  {}
) {}

export class SystemSkillRenameError extends Schema.TaggedError<SystemSkillRenameError>()(
  "SystemSkillRenameError",
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
