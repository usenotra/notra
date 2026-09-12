import { Schema } from "effect";

export class InternalDashboardError extends Schema.TaggedError<InternalDashboardError>()(
  "InternalDashboardError",
  {
    status: Schema.Number,
    code: Schema.NullOr(Schema.String),
    body: Schema.String,
    message: Schema.String,
  }
) {
  constructor(status: number, code: string | null, body: string) {
    super({
      status,
      code,
      body,
      message: `Internal dashboard request failed with status ${status}${body ? `: ${body}` : ""}`,
    });
  }
}

export class InternalDashboardTimeoutError extends Schema.TaggedError<InternalDashboardTimeoutError>()(
  "InternalDashboardTimeoutError",
  {
    timeoutMs: Schema.Number,
    message: Schema.String,
  }
) {
  constructor(timeoutMs: number) {
    super({
      timeoutMs,
      message: `Internal dashboard call timed out after ${timeoutMs}ms`,
    });
  }
}

export class InternalDashboardAdapterError extends Schema.TaggedError<InternalDashboardAdapterError>()(
  "InternalDashboardAdapterError",
  {
    kind: Schema.Literals([
      "configuration",
      "authentication",
      "transport",
      "decode",
    ]),
    message: Schema.String,
  }
) {}
