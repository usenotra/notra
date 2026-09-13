import { Effect, Schema } from "effect";

import { DELIVERY_QUEUE_NAME, EVENT_QUEUE_NAME } from "./constants/queues";
import { WebhookValidationError } from "./errors/webhooks";
import { deliver } from "./programs/deliveries";
import { cleanup, dispatchEvent, recover } from "./programs/recovery";
import { workerLayer } from "./runtime/worker";
import { DeliveryMessage, EventMessage } from "./schemas/webhooks";
import type { WorkerBindings } from "./types/worker";

export default {
  queue(batch: MessageBatch<unknown>, bindings: WorkerBindings) {
    return Effect.runPromise(
      Effect.forEach(
        batch.messages,
        (message) =>
          Effect.gen(function* () {
            if (batch.queue === EVENT_QUEUE_NAME) {
              const body = yield* Schema.decodeUnknownEffect(EventMessage)(
                message.body
              );
              yield* dispatchEvent(body.eventId);
            } else if (batch.queue === DELIVERY_QUEUE_NAME) {
              const body = yield* Schema.decodeUnknownEffect(DeliveryMessage)(
                message.body
              );
              yield* deliver(body.deliveryId);
            } else {
              return yield* new WebhookValidationError({
                message: "Unknown queue",
              });
            }
            yield* Effect.sync(() => message.ack());
          }).pipe(
            Effect.catch((error) =>
              Effect.gen(function* () {
                yield* Effect.logError("Webhook queue processing failed").pipe(
                  Effect.annotateLogs({
                    queue: batch.queue,
                    messageId: message.id,
                    errorType: error._tag,
                  })
                );
                yield* Effect.sync(() => message.retry({ delaySeconds: 60 }));
              })
            )
          ),
        { concurrency: 5, discard: true }
      ).pipe(Effect.provide(workerLayer(bindings)))
    );
  },
  scheduled(_controller: ScheduledController, bindings: WorkerBindings) {
    return Effect.runPromise(
      Effect.gen(function* () {
        yield* recover();
        yield* cleanup();
      }).pipe(Effect.provide(workerLayer(bindings)))
    );
  },
} satisfies ExportedHandler<WorkerBindings, unknown>;
