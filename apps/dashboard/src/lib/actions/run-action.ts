import { Effect } from "effect";

import { ActionFailure } from "@/lib/actions/errors";
import { getTranslations } from "@/lib/i18n/server";
import type { ActionResult } from "@/types/organizations/actions";

export async function runAction<T>(
  effect: Effect.Effect<T, ActionFailure>
): Promise<ActionResult<T>> {
  const outcome = await Effect.runPromise(
    Effect.result(
      effect.pipe(
        Effect.catchDefect((defect) =>
          Effect.fail(
            new ActionFailure({
              message: "Something went wrong",
              cause: defect,
            })
          )
        )
      )
    )
  );

  if (outcome._tag === "Success") {
    return { data: outcome.success, error: null };
  }

  const failure = outcome.failure;
  if (failure.cause === undefined) {
    return {
      data: null,
      error: { message: failure.message, code: failure.code },
    };
  }

  const t = await getTranslations("common.errors");
  return {
    data: null,
    error: { message: t("generic"), code: failure.code },
  };
}
