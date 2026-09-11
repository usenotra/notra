/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class EventTriggerNotFoundError extends Schema.TaggedError<EventTriggerNotFoundError>()(
  "EventTriggerNotFoundError",
  {}
) {}

export class EventTriggerDuplicateError extends Schema.TaggedError<EventTriggerDuplicateError>()(
  "EventTriggerDuplicateError",
  {}
) {}

export class EventTriggerTargetsNotFoundError extends Schema.TaggedError<EventTriggerTargetsNotFoundError>()(
  "EventTriggerTargetsNotFoundError",
  { message: Schema.String }
) {}

export class EventTriggerDatabaseError extends Schema.TaggedError<EventTriggerDatabaseError>()(
  "EventTriggerDatabaseError",
  { cause: Schema.Defect() }
) {}
