import { Effect } from "effect";
import type * as z from "zod";

import { ACTION_ERROR_CODES } from "@/constants/actions";
import { ActionFailure } from "@/lib/actions/errors";
import { organizationActionMessage } from "@/lib/organizations/action-messages";

export function validateActionInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown
): Effect.Effect<z.output<Schema>, ActionFailure> {
  const result = schema.safeParse(input);

  if (!result.success) {
    return organizationActionMessage("actions.invalidInput").pipe(
      Effect.flatMap((message) =>
        Effect.fail(
          new ActionFailure({ code: ACTION_ERROR_CODES.INVALID_INPUT, message })
        )
      )
    );
  }

  return Effect.succeed(result.data);
}
