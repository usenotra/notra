// Local wrangler entry: same queue/cron handler as src/worker.ts, Postgres instead of Neon.
import { Config, ConfigProvider, Effect, Layer } from "effect";

import { processQueueBatch, runScheduledPass } from "../src/runtime/handler";
import { postgresDatabaseLayer } from "../src/runtime/postgres";
import { webCryptoLayer } from "../src/services/crypto";
import { cloudflareQueuesLayer } from "../src/services/queue";
import { cloudflareTransportLayer } from "../src/services/transport";
import type { WorkerBindings } from "../src/types/worker";

const localWorkerLayer = (bindings: WorkerBindings) =>
  Layer.mergeAll(
    postgresDatabaseLayer,
    Layer.unwrap(
      Effect.map(Config.Redacted("WEBHOOK_ENCRYPTION_KEY"), webCryptoLayer)
    ),
    cloudflareQueuesLayer(bindings),
    cloudflareTransportLayer
  ).pipe(
    Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(bindings)))
  );

export default {
  queue(batch: MessageBatch<unknown>, bindings: WorkerBindings) {
    return Effect.runPromise(
      processQueueBatch(batch).pipe(Effect.provide(localWorkerLayer(bindings)))
    );
  },
  scheduled(_controller: ScheduledController, bindings: WorkerBindings) {
    return Effect.runPromise(
      runScheduledPass().pipe(Effect.provide(localWorkerLayer(bindings)))
    );
  },
} satisfies ExportedHandler<WorkerBindings, unknown>;
