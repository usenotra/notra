/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class AgentReadinessStartError extends Schema.TaggedError<AgentReadinessStartError>()(
  "AgentReadinessStartError",
  { cause: Schema.Defect() }
) {}

export class AgentReadinessApiError extends Schema.TaggedError<AgentReadinessApiError>()(
  "AgentReadinessApiError",
  { message: Schema.String, cause: Schema.optional(Schema.Defect()) }
) {}

export class AgentReadinessTargetMissingError extends Schema.TaggedError<AgentReadinessTargetMissingError>()(
  "AgentReadinessTargetMissingError",
  { message: Schema.String }
) {}

export class AgentReadinessClaimError extends Schema.TaggedError<AgentReadinessClaimError>()(
  "AgentReadinessClaimError",
  { message: Schema.String }
) {}

/** Both failures matter: the handoff/scan failed and its failure could not be persisted. */
export class AgentReadinessStampError extends Schema.TaggedError<AgentReadinessStampError>()(
  "AgentReadinessStampError",
  { cause: Schema.Defect(), stampCause: Schema.Defect() }
) {}
