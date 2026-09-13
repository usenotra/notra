import { Effect } from "effect";

import { WebhookCryptoError } from "../errors/webhooks";
import { cryptoOperation, decodeBase64 } from "./crypto";
import { base64 } from "./encoding";

const importSigningKey = Effect.fn("webhooks.importSigningKey")(function* (
  secret: string
) {
  const raw = yield* decodeBase64(secret.replace(/^whsec_/, ""), "hmac.decode");
  if (raw.length !== 32) {
    return yield* new WebhookCryptoError({ operation: "hmac.invalidSecret" });
  }
  return yield* cryptoOperation("hmac.import", () =>
    crypto.subtle.importKey(
      "raw",
      raw,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
  );
});

export const hmacSign = Effect.fn("webhooks.hmacSign")(function* (
  secret: string,
  message: string
) {
  const key = yield* importSigningKey(secret);
  const signature = yield* cryptoOperation("hmac.sign", () =>
    crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  );
  return base64(new Uint8Array(signature));
});

export const hmacVerify = Effect.fn("webhooks.hmacVerify")(function* (
  secret: string,
  message: string,
  signature: string
) {
  const key = yield* importSigningKey(secret);
  const raw = yield* decodeBase64(signature, "hmac.decodeSignature");
  return yield* cryptoOperation("hmac.verify", () =>
    crypto.subtle.verify("HMAC", key, raw, new TextEncoder().encode(message))
  );
});
