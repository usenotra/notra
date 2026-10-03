import { Effect } from "effect";

import { WebhookValidationError } from "../errors/webhooks";
import type { BrandAnalysisOutcome } from "../types/brand-analysis";
import { publishEvent } from "./events";

export const publishBrandAnalysisOutcome = Effect.fn(
  "webhooks.publishBrandAnalysisOutcome"
)(function* (job: BrandAnalysisOutcome) {
  const base = {
    organizationId: job.organizationId,
    sourceKey: `brand-analysis:${job.id}:terminal`,
  };
  switch (job.status) {
    case "completed":
      if (!job.brandIdentityId) {
        return yield* new WebhookValidationError({
          message: "Completed brand analysis must have a brand identity ID",
        });
      }
      return yield* publishEvent({
        ...base,
        event: {
          type: "brand_identity.generation.completed",
          data: { jobId: job.id, brandIdentityId: job.brandIdentityId },
        },
      });
    case "failed":
      return yield* publishEvent({
        ...base,
        event: {
          type: "brand_identity.generation.failed",
          data: { jobId: job.id, error: job.error },
        },
      });
    case "queued":
    case "running":
      return;
    default: {
      const unexpected: never = job.status;
      return yield* Effect.die(
        `Unexpected brand analysis status: ${unexpected}`
      );
    }
  }
});
