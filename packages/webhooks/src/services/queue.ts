import { Array, Context, Effect, Layer } from "effect";

import { SEND_BATCH_CHUNK } from "../constants/queues";
import { WebhookQueueError } from "../errors/webhooks";
import type { WebhookQueuesService } from "../types/services";
import type { WorkerBindings } from "../types/worker";

export class WebhookQueues extends Context.Service<
  WebhookQueues,
  WebhookQueuesService
>()("@notra/webhooks/Queues") {}

export const cloudflareQueuesLayer = (
  bindings: Pick<WorkerBindings, "EVENT_QUEUE" | "DELIVERY_QUEUE">
) =>
  Layer.succeed(
    WebhookQueues,
    WebhookQueues.of({
      event: Effect.fn("webhooks.queues.event")((eventId) =>
        Effect.tryPromise({
          try: () => bindings.EVENT_QUEUE.send({ eventId }),
          catch: (cause) =>
            new WebhookQueueError({ operation: "event.send", cause }),
        })
      ),
      delivery: Effect.fn("webhooks.queues.delivery")((deliveryId) =>
        Effect.tryPromise({
          try: () => bindings.DELIVERY_QUEUE.send({ deliveryId }),
          catch: (cause) =>
            new WebhookQueueError({ operation: "delivery.send", cause }),
        })
      ),
      deliveries: Effect.fn("webhooks.queues.deliveries")(
        function* (deliveryIds) {
          yield* Effect.forEach(
            Array.chunksOf(deliveryIds, SEND_BATCH_CHUNK),
            (chunk) =>
              Effect.tryPromise({
                try: () =>
                  bindings.DELIVERY_QUEUE.sendBatch(
                    chunk.map((deliveryId) => ({ body: { deliveryId } }))
                  ),
                catch: (cause) =>
                  new WebhookQueueError({
                    operation: "delivery.sendBatch",
                    cause,
                  }),
              }),
            { discard: true }
          );
        }
      ),
    })
  );
