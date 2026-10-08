import { Context, Effect, Layer } from "effect";

import type { WebhookQueuesService } from "../types/services";
import type { WorkerBindings } from "../types/worker";
import { sendQueueBatches } from "../utils/queue";

export class WebhookQueues extends Context.Service<
  WebhookQueues,
  WebhookQueuesService
>()("@notra/webhooks/Queues") {}

export const cloudflareQueuesLayer = (
  bindings: Pick<WorkerBindings, "DELIVERY_QUEUE">
) =>
  Layer.succeed(
    WebhookQueues,
    WebhookQueues.of({
      deliveries: Effect.fn("webhooks.queues.deliveries")((deliveryIds) =>
        sendQueueBatches(
          bindings.DELIVERY_QUEUE,
          deliveryIds.map((deliveryId) => ({ deliveryId })),
          "delivery.sendBatch"
        )
      ),
    })
  );
