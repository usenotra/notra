import {
  WebhookNotFound,
  WebhookValidationError,
} from "@notra/webhooks/errors/webhooks";
import { postgresDatabaseLayer } from "@notra/webhooks/runtime/postgres";
import type { WebhookDatabase } from "@notra/webhooks/services/database";
import { ORPCError } from "@orpc/server";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(postgresDatabaseLayer);

export function runOutboundWebhook<A, E>(
  program: Effect.Effect<A, E, WebhookDatabase>
) {
  return runtime.runPromise(
    program.pipe(
      Effect.mapError((error) => {
        if (error instanceof ORPCError) {
          return error;
        }
        if (error instanceof WebhookNotFound) {
          return new ORPCError("NOT_FOUND", {
            message: "Webhook resource not found",
          });
        }
        if (error instanceof WebhookValidationError) {
          return new ORPCError("BAD_REQUEST", { message: error.message });
        }
        return new ORPCError("SERVICE_UNAVAILABLE", {
          message:
            "Webhooks are unavailable. Check the database migration and webhook configuration.",
        });
      })
    )
  );
}
