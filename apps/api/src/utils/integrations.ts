import { Effect } from "effect";
import type { Context } from "hono";

import type { IntegrationDatabaseError } from "../errors/integrations";
import type { IntegrationDomainError } from "../types/integrations";
import type { IntegrationTrigger } from "./triggers";

export function serializeDisabledTriggers(
  affectedTriggers: readonly IntegrationTrigger[]
) {
  return {
    disabledSchedules: affectedTriggers
      .filter((trigger) => trigger.sourceType === "cron")
      .map((trigger) => ({ id: trigger.id, name: trigger.name })),
    disabledEvents: affectedTriggers
      .filter((trigger) => trigger.sourceType !== "cron")
      .map((trigger) => ({ id: trigger.id, name: trigger.name })),
  };
}

/** Leave unexpected database errors to Hono's central error handler. */
export function runIntegrationProgram<A, E extends IntegrationDomainError>(
  program: Effect.Effect<A, E | IntegrationDatabaseError>
) {
  return Effect.runPromise(
    Effect.result(
      program.pipe(
        Effect.catchTag("IntegrationDatabaseError", (failure) =>
          Effect.die(failure.cause)
        )
      )
    )
  );
}

export function respondToIntegrationFailure(
  c: Context,
  failure: IntegrationDomainError
) {
  if (failure._tag === "IntegrationNotFoundError") {
    return c.json({ error: "Integration not found" }, 404);
  }

  if (failure._tag === "IntegrationDuplicateError") {
    return c.json({ error: "Repository already connected" }, 409);
  }

  if (failure._tag === "GitHubAccessError") {
    return c.json({ error: failure.message }, 400);
  }

  if (failure._tag === "IntegrationUnavailableError") {
    return c.json({ error: "GitHub integrations are unavailable" }, 503);
  }

  if (failure._tag === "IntegrationCreateFailedError") {
    return c.json({ error: "Failed to create integration" }, 503);
  }

  if (failure._tag === "IntegrationCreateError") {
    return c.json({ error: "Failed to create GitHub integration" }, 400);
  }
}
