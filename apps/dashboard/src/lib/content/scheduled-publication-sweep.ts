import {
  claimDueScheduledPublications,
  releaseScheduledPublicationClaim,
} from "@notra/ai/utils/scheduled-publications";

import { notifyScheduledPublicationFailed } from "@/lib/email/scheduled-publication";
import { startScheduledPublicationRun } from "@/lib/workflows/start";
import type { ScheduledPublicationSweepResult } from "@/types/content/scheduled-publications";

/**
 * Claims every due scheduled publication and starts one workflow per row.
 *
 * The rows are the schedule, so nothing here has to be remembered between
 * ticks: a row whose start fails is handed back to be picked up a minute
 * later, and a row whose run dies keeps its lease until it expires and the
 * next sweep takes it over. `postId` narrows the sweep for "publish now".
 */
export async function runScheduledPublicationSweep(options?: {
  postId?: string;
}): Promise<ScheduledPublicationSweepResult> {
  const claims = await claimDueScheduledPublications({
    postId: options?.postId,
  });
  const results = await Promise.allSettled(
    claims.map((claim) =>
      startScheduledPublicationRun({
        scheduledPublicationId: claim.id,
        claimToken: claim.claimToken,
      })
    )
  );

  let released = 0;
  await Promise.all(
    results.map(async (result, index) => {
      const claim = claims[index];
      if (result.status === "fulfilled" || !claim) {
        return;
      }
      console.error("[ScheduledPublication] Failed to start workflow", {
        scheduledPublicationId: claim.id,
        error: result.reason,
      });
      try {
        const outcome = await releaseScheduledPublicationClaim(claim);
        if (outcome === "released") {
          released += 1;
        }
        if (outcome === "failed") {
          await notifyScheduledPublicationFailed(claim.id).catch(
            (error: unknown) => {
              console.error("[ScheduledPublication] Failure email failed", {
                scheduledPublicationId: claim.id,
                error,
              });
            }
          );
        }
      } catch (error) {
        // The lease expires on its own; the row is retried after that.
        console.error("[ScheduledPublication] Failed to release claim", {
          scheduledPublicationId: claim.id,
          error,
        });
      }
    })
  );

  return {
    claimed: claims.length,
    started:
      claims.length - results.filter((r) => r.status === "rejected").length,
    released,
  };
}
