import { SCHEDULED_PUBLICATION_ERROR_CODES } from "@notra/ai/constants/scheduled-publications";
import {
  beginScheduledPublicationAttempt,
  getRecordedScheduledPublicationAttempt,
  recordScheduledPublicationAttemptOutcome,
} from "@notra/ai/utils/scheduled-publications";

import { publishScheduledDestination } from "@/lib/content/scheduled-publication-destinations";
import type {
  ScheduledPublicationAttemptResult,
  ScheduledPublicationWorkflowInput,
} from "@/types/content/scheduled-publications";

/**
 * Publishes one claimed destination and returns the outcome without writing
 * it. Runs in the app (behind an internal route) rather than in the workflow
 * step bundle: the destinations reach request-scoped TanStack Start helpers
 * that only resolve in the app build.
 *
 * Returns `null` when the claim is gone (canceled, or a newer sweep took the
 * row over after this run's lease expired).
 */
export async function runScheduledPublicationAttempt(
  input: ScheduledPublicationWorkflowInput
): Promise<ScheduledPublicationAttemptResult | null> {
  const claim = {
    id: input.scheduledPublicationId,
    claimToken: input.claimToken,
  };
  // A retried call whose first response got lost: hand back what that call
  // achieved instead of publishing again.
  const recorded = await getRecordedScheduledPublicationAttempt(claim);
  if (recorded) {
    return recorded;
  }
  const begun = await beginScheduledPublicationAttempt(claim);
  if (!begun) {
    return null;
  }
  const { attempt } = begun;
  let outcome = begun.preempted;
  if (!outcome) {
    try {
      outcome = await publishScheduledDestination(attempt, input.claimToken);
    } catch (error) {
      // Only infrastructure errors get here; destination errors are returned.
      // The raw message stays in the log: it can carry SQL and parameters,
      // and `lastError` is shown in the app, the API and the failure email.
      console.error("[ScheduledPublication] Unexpected publish error", {
        scheduledPublicationId: attempt.id,
        error,
      });
      outcome = {
        kind: "error",
        code: SCHEDULED_PUBLICATION_ERROR_CODES.UNEXPECTED,
        message: "Publishing failed unexpectedly.",
        retryable: true,
      };
    }
  }
  await recordScheduledPublicationAttemptOutcome(claim, outcome);
  return {
    attempts: attempt.attempts,
    destination: attempt.destination,
    organizationId: attempt.organizationId,
    postId: attempt.postId,
    outcome,
  };
}
