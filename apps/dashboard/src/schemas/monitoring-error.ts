import { Schema } from "effect";

// Schema.TaggedError is a class factory, not an error constructor.
// oxlint-disable-next-line unicorn/throw-new-error
export class MonitoringOperationError extends Schema.TaggedError<MonitoringOperationError>()(
  "MonitoringOperationError",
  {
    operation: Schema.String,
    errorName: Schema.String,
  }
) {}
