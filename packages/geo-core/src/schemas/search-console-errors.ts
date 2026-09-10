/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class GeoSearchConsoleError extends Schema.TaggedError<GeoSearchConsoleError>()(
  "GeoSearchConsoleError",
  {
    reauthRequired: Schema.Boolean,
    status: Schema.optional(Schema.Number),
    cause: Schema.Defect(),
  }
) {}

export class GeoSearchConsoleStampError extends Schema.TaggedError<GeoSearchConsoleStampError>()(
  "GeoSearchConsoleStampError",
  { cause: Schema.Defect(), stampCause: Schema.Defect() }
) {}
