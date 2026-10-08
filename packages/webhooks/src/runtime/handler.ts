import { Effect, Schema } from "effect";

import { DELIVERY_CONCURRENCY } from "../constants/delivery";
import { DELIVERY_QUEUE_NAME } from "../constants/queues";
import { WebhookValidationError } from "../errors/webhooks";
import { deliver } from "../programs/deliveries";
import { DeliveryMessage } from "../schemas/webhooks";

export const processQueueBatch = Effect.fn("webhooks.processQueueBatch")(
  function* (batch: MessageBatch<unknown>) {
    yield* Effect.forEach(
      batch.messages,
      (message) =>
        Effect.gen(function* () {
          if (batch.queue !== DELIVERY_QUEUE_NAME) {
            return yield* new WebhookValidationError({
              message: "Unknown queue",
            });
          }
          const body = yield* Schema.decodeUnknownEffect(DeliveryMessage)(
            message.body
          );
          yield* deliver(body.deliveryId);
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
      { concurrency: DELIVERY_CONCURRENCY, discard: true }
    );
  }
);
