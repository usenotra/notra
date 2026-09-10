/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class GeoModelError extends Schema.TaggedError<GeoModelError>()(
  "GeoModelError",
  { operation: Schema.String, cause: Schema.Defect() }
) {}
