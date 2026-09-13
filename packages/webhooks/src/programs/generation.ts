import { Effect } from "effect";

import { WebhookValidationError } from "../errors/webhooks";
import type { GenerationOutcome } from "../types/generation";
import { publishEvent } from "./events";

export const publishGenerationOutcome = Effect.fn(
  "webhooks.publishGenerationOutcome"
)(function* (job: GenerationOutcome) {
  const base = {
    organizationId: job.organizationId,
    sourceKey: `generation:${job.id}:terminal`,
  };
  switch (job.status) {
    case "completed":
      if (!job.postId) {
        return yield* new WebhookValidationError({
          message: "Completed generation must have a post ID",
        });
      }
      return yield* publishEvent({
        ...base,
        event: {
          type: "post.generation.completed",
          data: { jobId: job.id, postId: job.postId },
        },
      });
    case "failed":
      return yield* publishEvent({
        ...base,
        event: {
          type: "post.generation.failed",
          data: { jobId: job.id, error: job.error },
        },
      });
    case "skipped":
      return yield* publishEvent({
        ...base,
        event: {
          type: "post.generation.skipped",
          data: { jobId: job.id, reason: job.error },
        },
      });
    case "queued":
    case "running":
      return;
    default: {
      const unexpected: never = job.status;
      return yield* Effect.die(`Unexpected generation status: ${unexpected}`);
    }
  }
});
