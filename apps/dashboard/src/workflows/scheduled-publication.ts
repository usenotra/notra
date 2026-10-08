import type { ScheduledPublicationWorkflowInput } from "@/types/content/scheduled-publications";

import {
  finishScheduledPublicationStep,
  reportScheduledPublicationStep,
  runScheduledPublicationStep,
} from "./steps/scheduled-publication-steps";

/**
 * One attempt at publishing one claimed destination of a scheduled post.
 * Started by the scheduled-publications cron sweep; the claim token fences
 * every write, so a run that lost its claim changes nothing.
 */
export async function scheduledPublicationWorkflow(
  input: ScheduledPublicationWorkflowInput
) {
  "use workflow";
  const run = await runScheduledPublicationStep(input);
  if (!run) {
    return { status: "superseded" as const };
  }
  const finish = await finishScheduledPublicationStep(
    input,
    run.attempts,
    run.outcome
  );
  if (finish !== "superseded") {
    await reportScheduledPublicationStep({
      scheduledPublicationId: input.scheduledPublicationId,
      organizationId: run.organizationId,
      postId: run.postId,
      destination: run.destination,
      finish,
      errorCode: run.outcome.kind === "error" ? run.outcome.code : null,
    });
  }
  return { status: finish };
}
