import { Schema } from "effect";

export class GeoSelectionInvalidError extends Schema.TaggedError<GeoSelectionInvalidError>()(
  "GeoSelectionInvalidError",
  {
    message: Schema.String,
  }
) {}

export class GeoScanNotFoundError extends Schema.TaggedError<GeoScanNotFoundError>()(
  "GeoScanNotFoundError",
  {
    scanId: Schema.String,
  }
) {}
