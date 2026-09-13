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

export function runWebhookApi<A, E>(
  runtime: ManagedRuntime.ManagedRuntime<WebhookDatabase, Config.ConfigError>,
  c: Context<ApiEnv>,
  program: Effect.Effect<A, E, WebhookDatabase>
) {
  return runtime.runPromise(
    program.pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          if (error instanceof WebhookNotFound) {
            return c.json({ error: "Webhook not found" }, 404);
          }
          if (error instanceof WebhookValidationError) {
            return c.json({ error: error.message }, 400);
          }
          return c.json({ error: "Webhooks unavailable" }, 503);
        })
      )
    )
  );
}

export const decodeOrganizationId = (c: Context<ApiEnv>) =>
  Schema.decodeUnknownEffect(OrganizationId)(getOrganizationId(c));
