import { Clock, Context, Effect, Layer } from "effect";

import { HTTP_TIMEOUT_MS } from "../constants/delivery";
import { WebhookTransportError } from "../errors/webhooks";
import type { WebhookTransportService } from "../types/services";
import type { DeliveryOutcome, SendRequest } from "../types/webhooks";
import { validateDns } from "../utils/dns";
import { parseRetryAfter } from "../utils/retry";

export class WebhookTransport extends Context.Service<
  WebhookTransport,
  WebhookTransportService
>()("@notra/webhooks/Transport") {}

export const cloudflareTransportLayer = Layer.succeed(
  WebhookTransport,
  WebhookTransport.of({
    send: Effect.fn("webhooks.http.send")(function* (request) {
      const started = yield* Clock.currentTimeMillis;
      const result = yield* Effect.gen(function* () {
        yield* validateDns(request.url);
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            fetch(request.url, {
              method: "POST",
              body: request.payload,
              headers: request.headers,
              redirect: "manual",
              signal,
            }),
          catch: () => new WebhookTransportError({ reason: "network" }),
        });
        const now = yield* Clock.currentTimeMillis;
        const retryAfterSeconds = parseRetryAfter(
          response.headers.get("retry-after"),
          now
        );
        const body = response.body;
        if (body) {
          yield* Effect.tryPromise({
            try: () => body.cancel(),
            catch: () => new WebhookTransportError({ reason: "network" }),
          }).pipe(Effect.ignore);
        }
        return {
          statusCode: response.status,
          retryAfterSeconds,
          error: response.ok ? null : `http_${response.status}`,
        };
      }).pipe(
        Effect.timeout(HTTP_TIMEOUT_MS),
        Effect.catchTag("TimeoutError", () =>
          Effect.fail(new WebhookTransportError({ reason: "timeout" }))
        ),
        Effect.catchTag("WebhookTransportError", (failure) =>
          Effect.succeed({
            statusCode: null,
            retryAfterSeconds: null,
            error: failure.reason,
          })
        )
      );
      const finished = yield* Clock.currentTimeMillis;
      return { ...result, durationMs: Math.max(0, finished - started) };
    }),
  })
);
