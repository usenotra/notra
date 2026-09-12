import { Effect } from "effect";
import type * as z from "zod";

import { ACTION_ERROR_CODES } from "@/constants/actions";
import { ActionFailure } from "@/lib/actions/errors";

const DEFAULT_INVALID_INPUT_MESSAGE = "Invalid input";

export function validateActionInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): Effect.Effect<z.output<Schema>, ActionFailure> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return Effect.fail(
      new ActionFailure({
        code: ACTION_ERROR_CODES.INVALID_INPUT,
        message:
          result.error.issues[0]?.message ?? DEFAULT_INVALID_INPUT_MESSAGE,
      })
    );
  }

  return Effect.succeed(result.data);
}
