import { Config, ConfigProvider, Effect, Layer } from "effect";

import { webCryptoLayer } from "../services/crypto";
import { cloudflareQueuesLayer } from "../services/queue";
import { cloudflareTransportLayer } from "../services/transport";
import type { WorkerBindings } from "../types/worker";
import { neonDatabaseLayer } from "./neon";

export const workerLayer = (bindings: WorkerBindings) =>
  Layer.mergeAll(
    Layer.unwrap(Effect.map(Config.string("DATABASE_URL"), neonDatabaseLayer)),
    Layer.unwrap(
      Effect.map(Config.redacted("WEBHOOK_ENCRYPTION_KEY"), webCryptoLayer)
    ),
    cloudflareQueuesLayer(bindings),
    cloudflareTransportLayer
  ).pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(bindings)))
  );
