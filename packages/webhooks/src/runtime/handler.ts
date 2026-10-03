import { Effect, Schema } from "effect";

import { DELIVERY_QUEUE_NAME, EVENT_QUEUE_NAME } from "../constants/queues";
import { WebhookValidationError } from "../errors/webhooks";
import { deliver } from "../programs/deliveries";
import {
  cleanup,
  dispatchEvent,
  emitMetrics,
  recover,
} from "../programs/recovery";
import { DeliveryMessage, EventMessage } from "../schemas/webhooks";

export const processQueueBatch = Effect.fn("webhooks.processQueueBatch")(
  function* (batch: MessageBatch<unknown>) {
    yield* Effect.forEach(
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
    );
  }
);

export const runScheduledPass = Effect.fn("webhooks.runScheduledPass")(
  function* () {
    yield* recover();
    yield* cleanup();
    yield* emitMetrics();
  }
);
