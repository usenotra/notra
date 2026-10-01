import { Config, Effect, Layer } from "effect";

import { webCryptoLayer } from "../services/crypto";

export const configuredCryptoLayer = Layer.unwrap(
  Effect.map(Config.Redacted("WEBHOOK_ENCRYPTION_KEY"), webCryptoLayer)
);
