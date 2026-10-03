import {
  WebhookNotFound,
  WebhookValidationError,
} from "@notra/webhooks/errors/webhooks";
import { OrganizationId } from "@notra/webhooks/schemas/webhooks";
import type { WebhookDatabase } from "@notra/webhooks/services/database";
import { Effect, Schema } from "effect";
import type { Config, ManagedRuntime } from "effect";
import type { Context } from "hono";

import type { ApiEnv } from "../types/env";
import { getOrganizationId } from "./auth";
import { logError } from "./logging";

export function runWebhookApi<A, E extends { readonly _tag: string }>(
  runtime: ManagedRuntime.ManagedRuntime<WebhookDatabase, Config.ConfigError>,
  c: Context<ApiEnv>,
  program: Effect.Effect<A, E, WebhookDatabase>
) {
  return runtime.runPromise(
    program.pipe(
      Effect.catchIf(Schema.is(WebhookNotFound), () =>
        Effect.succeed(c.json({ error: "Webhook not found" }, 404))
      ),
      Effect.catchIf(Schema.is(WebhookValidationError), (error) =>
        Effect.succeed(c.json({ error: error.message }, 400))
      ),
      Effect.catch((error) =>
        Effect.sync(() => {
          logError(`Webhook request failed (${error._tag})`, error);
          return c.json({ error: "Webhooks unavailable" }, 503);
        })
      )
    )
  );
}

export const decodeOrganizationId = (c: Context<ApiEnv>) =>
  Schema.decodeUnknownEffect(OrganizationId)(getOrganizationId(c)).pipe(
    Effect.mapError(
      () =>
        new WebhookValidationError({
          message:
            "The authenticated credential is not tied to an organization",
        })
    )
  );
