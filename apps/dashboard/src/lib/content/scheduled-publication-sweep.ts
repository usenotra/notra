import {
  claimDueScheduledPublications,
  releaseScheduledPublicationClaim,
  settleAbandonedScheduledPublications,
} from "@notra/ai/utils/scheduled-publications";

import { notifyScheduledPublicationFailed } from "@/lib/email/scheduled-publication";
import { startScheduledPublicationRun } from "@/lib/workflows/start";
import type { ScheduledPublicationSweepResult } from "@/types/content/scheduled-publications";

function notifyFailure(scheduledPublicationId: string) {
  return notifyScheduledPublicationFailed(scheduledPublicationId).catch(
    (error: unknown) => {
      console.error("[ScheduledPublication] Failure email failed", {
        scheduledPublicationId,
        error,
      });
    }
  );
}

/**
 * Claims every due scheduled publication and starts one workflow per row.
 *
 * The rows are the schedule, so nothing here has to be remembered between
 * ticks: a row whose start fails is handed back to be retried a minute
 * later, and a row whose run dies keeps its lease until it expires and the
 * next sweep takes it over. `postId` narrows the sweep to one post, for
 * "publish now" and QStash wakes.
 */
export async function runScheduledPublicationSweep(options?: {
  postId?: string;
  dueBy?: Date;
}): Promise<ScheduledPublicationSweepResult> {
  const abandoned = await settleAbandonedScheduledPublications({
    postId: options?.postId,
  });
  await Promise.all(abandoned.map(notifyFailure));
  const claims = await claimDueScheduledPublications({
    postId: options?.postId,
    dueBy: options?.dueBy,
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
          await notifyFailure(claim.id);
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
