import { Effect } from "effect";

import { WebhookCryptoError } from "../errors/webhooks";
import { base64, bytes } from "./encoding";

const importSigningKey = Effect.fn("webhooks.importSigningKey")(function* (
  secret: string
) {
  const raw = yield* Effect.try({
    try: () => bytes(secret.replace(/^whsec_/, "")),
    catch: () => new WebhookCryptoError({ operation: "hmac.decode" }),
  });
  if (raw.length !== 32) {
    return yield* new WebhookCryptoError({ operation: "hmac.invalidSecret" });
  }
  return yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.importKey(
        "raw",
        raw,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      ),
    catch: () => new WebhookCryptoError({ operation: "hmac.import" }),
  });
});

export const hmacSign = Effect.fn("webhooks.hmacSign")(function* (
  secret: string,
  message: string
) {
  const key = yield* importSigningKey(secret);
  const signature = yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
    catch: () => new WebhookCryptoError({ operation: "hmac.sign" }),
  });
  return base64(new Uint8Array(signature));
});

export const hmacVerify = Effect.fn("webhooks.hmacVerify")(function* (
  secret: string,
  message: string,
  signature: string
) {
  const key = yield* importSigningKey(secret);
  const raw = yield* Effect.try({
    try: () => bytes(signature),
    catch: () => new WebhookCryptoError({ operation: "hmac.decodeSignature" }),
  });
  return yield* Effect.tryPromise({
    try: () =>
      crypto.subtle.verify("HMAC", key, raw, new TextEncoder().encode(message)),
    catch: () => new WebhookCryptoError({ operation: "hmac.verify" }),
  });
});
