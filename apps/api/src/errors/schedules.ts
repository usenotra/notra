import { Schema } from "effect";

export class ScheduleNotFoundError extends Schema.TaggedError<ScheduleNotFoundError>()(
  "ScheduleNotFoundError",
  {}
) {}

export class ScheduleDuplicateError extends Schema.TaggedError<ScheduleDuplicateError>()(
  "ScheduleDuplicateError",
  {}
) {}

export class ScheduleMissingTargetsError extends Schema.TaggedError<ScheduleMissingTargetsError>()(
  "ScheduleMissingTargetsError",
  { message: Schema.String }
) {}

export class ScheduleQstashError extends Schema.TaggedError<ScheduleQstashError>()(
  "ScheduleQstashError",
  {
    message: Schema.String,
    status: Schema.Union([Schema.Literal(400), Schema.Literal(500)]),
  }
) {}

export class ScheduleDatabaseError extends Schema.TaggedError<ScheduleDatabaseError>()(
  "ScheduleDatabaseError",
  { cause: Schema.Defect() }
) {}
