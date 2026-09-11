import { Schema } from "effect";
import { z } from "zod";

export const retryErrorSchema = z.looseObject({
  code: z.string().optional(),
  status: z.number().optional(),
});

export class ToolOperationError extends Schema.TaggedError<ToolOperationError>()(
  "ToolOperationError",
  {
    cause: Schema.Defect(),
    operationName: Schema.String,
    retryable: Schema.Boolean,
    retryAfterMs: Schema.optional(Schema.Number),
    status: Schema.optional(Schema.Number),
  }
) {}
