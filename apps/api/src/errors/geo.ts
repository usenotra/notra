import { Schema } from "effect";

export class GeoSelectionInvalidError extends Schema.TaggedError<GeoSelectionInvalidError>()(
  "GeoSelectionInvalidError",
  {
    message: Schema.String,
  }
) {}
