import { Effect } from "effect";

import { WebhookCryptoError } from "../errors/webhooks";
import { bytes } from "./encoding";

export const cryptoOperation = <A>(operation: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => new WebhookCryptoError({ operation, cause }),
  });

export const decodeBase64 = (value: string, operation = "base64.decode") =>
  Effect.try({
    try: () => bytes(value),
    catch: (cause) => new WebhookCryptoError({ operation, cause }),
  });
