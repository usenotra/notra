/* oxlint-disable unicorn/throw-new-error -- Schema.TaggedError is a curried class factory, not a constructor. */
import { Schema } from "effect";

export class GeoSuggestionNotFoundError extends Schema.TaggedError<GeoSuggestionNotFoundError>()(
  "GeoSuggestionNotFoundError",
  { suggestionId: Schema.String }
) {}
