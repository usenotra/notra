import { getBaseUrl } from "@notra/ai/qstash/triggers";
import type {
  ScheduledPublicationFinish,
  ScheduledPublicationOutcome,
} from "@notra/ai/types/scheduled-publications";
import { finishScheduledPublicationAttempt } from "@notra/ai/utils/scheduled-publications";
import { POSTHOG_EVENTS } from "@notra/posthog/events";

import { SCHEDULED_PUBLICATION_ATTEMPT_ROUTE_PATH } from "@/constants/content-calendar";
import { trackServerEventAndFlush } from "@/lib/analytics/posthog-server";
import { notifyScheduledPublicationFailed } from "@/lib/email/scheduled-publication";
import type {
  ScheduledPublicationAttemptResult,
  ScheduledPublicationWorkflowInput,
} from "@/types/content/scheduled-publications";

/**
 * Publishes one claimed destination through the app and returns the outcome
 * without writing it. Keeping the write in its own step means a database
 * hiccup after a post went out retries only the write, never the post.
 *
 * The publish runs behind an internal route because the destinations need
 * app-only modules the step bundle cannot load. A failed call throws, so the
 * step retries it; a re-run is safe, see below.
 */
export async function runScheduledPublicationStep(
  input: ScheduledPublicationWorkflowInput
): Promise<ScheduledPublicationAttemptResult | null> {
  "use step";
  const response = await fetch(
    `${getBaseUrl()}${SCHEDULED_PUBLICATION_ATTEMPT_ROUTE_PATH}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.INTERNAL_WORKFLOW_SECRET ?? ""}`,
      },
      body: JSON.stringify(input),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Scheduled publication attempt failed with HTTP ${response.status}`
    );
  }
  const body = (await response.json()) as {
    result: ScheduledPublicationAttemptResult | null;
  };
  return body.result;
}

// Destination errors are returned, so only a failed call throws here. A
// re-run is safe: the route hands back an outcome it already recorded for
// the claim, and the publish itself is idempotent or, for social posts,
// fenced by `external_attempt_at`.
runScheduledPublicationStep.maxRetries = 4;

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
