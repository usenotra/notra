import { Array, Effect } from "effect";

import { SEND_BATCH_CHUNK } from "../constants/queues";
import { WebhookQueueError } from "../errors/webhooks";

export const sendQueueBatches = Effect.fn("webhooks.queues.sendBatches")(
  function* <Body>(
    queue: Queue<Body>,
    bodies: readonly Body[],
    operation: string
  ) {
    yield* Effect.forEach(
      Array.chunksOf(bodies, SEND_BATCH_CHUNK),
      (chunk) =>
        Effect.tryPromise({
          try: () => queue.sendBatch(chunk.map((body) => ({ body }))),
          catch: (cause) => new WebhookQueueError({ operation, cause }),
        }),
      { discard: true }
    );
  }
);
