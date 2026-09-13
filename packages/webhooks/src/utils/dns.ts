import { Effect, Schema } from "effect";

import { WebhookTransportError } from "../errors/webhooks";
import { DnsResponse } from "../schemas/webhooks";
import { isPublicAddress, validateEndpointUrl } from "./url";

export const validateDns = Effect.fn("webhooks.validateDns")(function* (
  url: string
) {
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
