import {
  type ContentEmailDigestPayload,
  contentEmailDigestPayloadSchema,
} from "@notra/schemas/dashboard/workflows";
import { sleep } from "workflow";

import {
  WORKFLOW_ANALYTICS_NAMES,
  WORKFLOW_OUTCOMES,
} from "@/constants/workflow-analytics";
import { CONTENT_EMAIL_DIGEST_DELAY } from "@/constants/workflows";

import { flushContentEmailDigestStep } from "./steps/content-email-digest-step";
import { trackWorkflowOutcome } from "./steps/workflow-lifecycle-steps";

export async function contentEmailDigestWorkflow(
  payload: ContentEmailDigestPayload
) {
  "use workflow";

  const parsedPayload = contentEmailDigestPayloadSchema.parse(payload);
  const workflowStartedAt = Date.now();
  await sleep(CONTENT_EMAIL_DIGEST_DELAY);
  await flushContentEmailDigestStep(parsedPayload);
  await trackWorkflowOutcome({
    workflow: WORKFLOW_ANALYTICS_NAMES.CONTENT_EMAIL_DIGEST,
    outcome: WORKFLOW_OUTCOMES.COMPLETED,
    organizationId: parsedPayload.organizationId,
    startedAt: workflowStartedAt,
    properties: { kind: parsedPayload.kind },
  });
}
