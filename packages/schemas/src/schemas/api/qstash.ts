import { Schema } from "effect";
import { z } from "zod";

export class QstashError extends Schema.TaggedError<QstashError>()(
  "QstashError",
  {
    kind: Schema.Literals([
      "configuration",
      // QStash cannot reach the workflow destination (missing or unresolvable
      // WORKFLOW_BASE_URL); callers surface it as a setup problem, not a 500.
      "destination",
      "transport",
      "timeout",
      "http",
      "decode",
    ]),
    message: Schema.String,
    status: Schema.optional(Schema.Number),
  }
) {}

export const qstashScheduleResponseSchema = z.object({
  scheduleId: z.string().min(1).optional(),
});
