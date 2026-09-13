import { Clock, Context, Effect, Layer, Schema } from "effect";

import { HTTP_TIMEOUT_MS } from "../constants/delivery";
import { WebhookTransportError } from "../errors/webhooks";
import { DnsResponse } from "../schemas/webhooks";
import type { WebhookTransportService } from "../types/services";
import type { DeliveryOutcome, SendRequest } from "../types/webhooks";
import { parseRetryAfter } from "../utils/retry";
import { isPublicAddress, validateEndpointUrl } from "../utils/url";

export class WebhookTransport extends Context.Service<
  WebhookTransport,
  WebhookTransportService
>()("@notra/webhooks/Transport") {}

const validateDns = Effect.fn("webhooks.validateDns")(function* (url: string) {
  const normalized = yield* validateEndpointUrl(url).pipe(
    Effect.mapError(() => new WebhookTransportError({ reason: "unsafe_url" }))
  );
  const hostname = new URL(normalized).hostname;
  const answers = yield* Effect.forEach(
    ["A", "AAAA"],
    (type) =>
      Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
          try: (signal) =>
            fetch(
              `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
              {
                signal,
                headers: { accept: "application/dns-json" },
                redirect: "error",
              }
            ),
          catch: () => new WebhookTransportError({ reason: "network" }),
        });
        if (!response.ok) {
          return yield* new WebhookTransportError({ reason: "network" });
        }
        const json: unknown = yield* Effect.tryPromise({
          try: () => response.json(),
          catch: () => new WebhookTransportError({ reason: "network" }),
        });
        const dns = yield* Schema.decodeUnknownEffect(DnsResponse)(json).pipe(
          Effect.mapError(
            () => new WebhookTransportError({ reason: "network" })
          )
        );
        if (dns.Status !== 0) {
          return yield* new WebhookTransportError({ reason: "network" });
        }
        return (dns.Answer ?? [])
          .filter((answer) => answer.type === 1 || answer.type === 28)
          .map((answer) => answer.data);
      }),
    { concurrency: 2 }
  );
  const addresses = answers.flat();
  if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
    return yield* new WebhookTransportError({ reason: "unsafe_url" });
  }
});

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
