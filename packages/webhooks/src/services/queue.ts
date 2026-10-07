import { Context, Effect, Layer } from "effect";

import type { WebhookQueuesService } from "../types/services";
import type { WorkerBindings } from "../types/worker";
import { sendQueueBatches } from "../utils/queue";

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
      events: Effect.fn("webhooks.queues.events")((eventIds) =>
        sendQueueBatches(
          bindings.EVENT_QUEUE,
          eventIds.map((eventId) => ({ eventId })),
          "event.sendBatch"
        )
      ),
      deliveries: Effect.fn("webhooks.queues.deliveries")((deliveryIds) =>
        sendQueueBatches(
          bindings.DELIVERY_QUEUE,
          deliveryIds.map((deliveryId) => ({ deliveryId })),
          "delivery.sendBatch"
        )
      ),
    })
  );
