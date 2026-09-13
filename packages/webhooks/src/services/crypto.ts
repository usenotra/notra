import { Context, Effect, Layer, Redacted } from "effect";

import { WebhookCryptoError } from "../errors/webhooks";
import type { WebhookCryptoService } from "../types/services";
import { cryptoOperation, decodeBase64 } from "../utils/crypto";
import { base64 } from "../utils/encoding";
import { hmacSign, hmacVerify } from "../utils/hmac";

export class WebhookCrypto extends Context.Service<
  WebhookCrypto,
  WebhookCryptoService
>()("@notra/webhooks/Crypto") {}

export const webCryptoLayer = (encryptionKey: Redacted.Redacted<string>) =>
  Layer.effect(
    WebhookCrypto,
    Effect.gen(function* () {
      const rawKey = yield* decodeBase64(Redacted.value(encryptionKey));
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
            const iv = yield* decodeBase64(ivText);
            const ciphertext = yield* decodeBase64(ciphertextText);
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
