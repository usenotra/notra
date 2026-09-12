import { Effect } from "effect";

import { ActionFailure } from "@/lib/actions/errors";
import type { ActionResult } from "@/types/organizations/actions";

export function runAction<T>(
  effect: Effect.Effect<T, ActionFailure>
): Promise<ActionResult<T>> {
  return Effect.runPromise(
    effect.pipe(
      Effect.catchDefect((defect) =>
        Effect.fail(
          new ActionFailure({ message: "Something went wrong", cause: defect })
        )
      ),
      Effect.match({
        onSuccess: (data): ActionResult<T> => ({ data, error: null }),
        onFailure: (error): ActionResult<T> => ({
          data: null,
          error: { message: error.message, code: error.code },
        }),
      })
    )
  );
}
