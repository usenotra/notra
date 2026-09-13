import { Context, Effect, Layer, Redacted } from "effect";

import { WebhookCryptoError } from "../errors/webhooks";
import type { WebhookCryptoService } from "../types/services";
import { base64, bytes } from "../utils/encoding";
import { hmacSign, hmacVerify } from "../utils/hmac";

export class WebhookCrypto extends Context.Service<
  WebhookCrypto,
  WebhookCryptoService
>()("@notra/webhooks/Crypto") {}

const cryptoOperation = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: () => new WebhookCryptoError({ operation }),
  });
const decode = (value: string) =>
  Effect.try({
    try: () => bytes(value),
    catch: () => new WebhookCryptoError({ operation: "base64.decode" }),
  });

export const webCryptoLayer = (encryptionKey: Redacted.Redacted<string>) =>
  Layer.effect(
    WebhookCrypto,
    Effect.gen(function* () {
      const rawKey = yield* decode(Redacted.value(encryptionKey));
      if (rawKey.length !== 32) {
        return yield* new WebhookCryptoError({
          operation: "encryptionKey.mustBe32Bytes",
        });
      }
      const key = yield* cryptoOperation("key.import", () =>
        crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
          "encrypt",
          "decrypt",
        ])
      );
      return WebhookCrypto.of({
        createSecret: () =>
          Effect.sync(
            () => `whsec_${base64(crypto.getRandomValues(new Uint8Array(32)))}`
          ),
        encrypt: Effect.fn("webhooks.encrypt")(function* (secret, endpointId) {
          const iv = yield* Effect.sync(() =>
            crypto.getRandomValues(new Uint8Array(12))
          );
          const ciphertext = yield* cryptoOperation("encrypt", () =>
            crypto.subtle.encrypt(
              {
                name: "AES-GCM",
                iv,
                additionalData: new TextEncoder().encode(endpointId),
              },
              key,
              new TextEncoder().encode(secret)
            )
          );
          return `v1.${base64(iv)}.${base64(new Uint8Array(ciphertext))}`;
        }),
        decrypt: Effect.fn("webhooks.decrypt")(
          function* (encrypted, endpointId) {
            const [version, ivText, ciphertextText, extra] =
              encrypted.split(".");
            if (
              version !== "v1" ||
              !ivText ||
              !ciphertextText ||
              extra !== undefined
            ) {
              return yield* new WebhookCryptoError({
                operation: "decrypt.format",
              });
            }
            const iv = yield* decode(ivText);
            const ciphertext = yield* decode(ciphertextText);
            const plaintext = yield* cryptoOperation("decrypt", () =>
              crypto.subtle.decrypt(
                {
                  name: "AES-GCM",
                  iv,
                  additionalData: new TextEncoder().encode(endpointId),
                },
                key,
                ciphertext
              )
            );
            return new TextDecoder().decode(plaintext);
          }
        ),
        sign: hmacSign,
        verify: hmacVerify,
      });
    })
  );
