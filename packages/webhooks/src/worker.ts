import { Effect } from "effect";

import { sweep } from "./programs/recovery";
import { processQueueBatch } from "./runtime/handler";
import { workerLayer } from "./runtime/worker";
import type { WorkerBindings } from "./types/worker";

export default {
  queue(batch: MessageBatch<unknown>, bindings: WorkerBindings) {
    return Effect.runPromise(
      processQueueBatch(batch).pipe(Effect.provide(workerLayer(bindings)))
    );
  },
  scheduled(_controller: ScheduledController, bindings: WorkerBindings) {
    return Effect.runPromise(
      sweep().pipe(Effect.provide(workerLayer(bindings)), Effect.asVoid)
    );
  },
} satisfies ExportedHandler<WorkerBindings, unknown>;
