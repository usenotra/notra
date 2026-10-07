import { SCHEDULED_PUBLICATION_ERROR_CODES } from "@notra/ai/constants/scheduled-publications";
import type {
  ScheduledPublicationFinish,
  ScheduledPublicationOutcome,
} from "@notra/ai/types/scheduled-publications";
import {
  beginScheduledPublicationAttempt,
  finishScheduledPublicationAttempt,
} from "@notra/ai/utils/scheduled-publications";
import { POSTHOG_EVENTS } from "@notra/posthog/events";

import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { publishScheduledDestination } from "@/lib/content/scheduled-publication-destinations";
import { notifyScheduledPublicationFailed } from "@/lib/email/scheduled-publication";
import type { ScheduledPublicationWorkflowInput } from "@/types/content/scheduled-publications";

/**
 * Publishes one claimed destination and returns the outcome without writing
 * it. Keeping the write in its own step means a database hiccup after a post
 * went out retries only the write, never the post.
 *
 * Returns `null` when the claim is gone (canceled, or a newer sweep took the
 * row over after this run's lease expired).
 */
export async function runScheduledPublicationStep(
  input: ScheduledPublicationWorkflowInput
): Promise<{
  attempts: number;
  destination: string;
  organizationId: string;
  postId: string;
  outcome: ScheduledPublicationOutcome;
} | null> {
  "use step";
  const claim = {
    id: input.scheduledPublicationId,
    claimToken: input.claimToken,
  };
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
  return {
    attempts: attempt.attempts,
    destination: attempt.destination,
    organizationId: attempt.organizationId,
    postId: attempt.postId,
    outcome,
  };
}

// Destination errors are returned, so only a failed claim read throws here.
// A step re-run after a crash is safe: every destination is idempotent or,
// for social posts, fenced by `external_attempt_at`.
runScheduledPublicationStep.maxRetries = 2;

export async function finishScheduledPublicationStep(
  input: ScheduledPublicationWorkflowInput,
  attempts: number,
  outcome: ScheduledPublicationOutcome
): Promise<ScheduledPublicationFinish> {
  "use step";
  return finishScheduledPublicationAttempt(
    { id: input.scheduledPublicationId, claimToken: input.claimToken },
    attempts,
    outcome
  );
}

finishScheduledPublicationStep.maxRetries = 8;

export async function reportScheduledPublicationStep(input: {
  scheduledPublicationId: string;
  organizationId: string;
  postId: string;
  destination: string;
  finish: ScheduledPublicationFinish;
  errorCode: string | null;
}): Promise<void> {
  "use step";
  if (input.finish === "failed") {
    await notifyScheduledPublicationFailed(input.scheduledPublicationId);
  }
  await trackServerEventAndFlush({
    event: POSTHOG_EVENTS.CONTENT_SCHEDULED_PUBLISH_FINISHED,
    organizationId: input.organizationId,
    properties: {
      content_id: input.postId,
      destination: input.destination,
      outcome: input.finish,
      error_code: input.errorCode,
    },
  });
}

reportScheduledPublicationStep.maxRetries = 3;
