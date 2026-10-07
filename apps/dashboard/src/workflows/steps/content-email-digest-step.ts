import type { ContentEmailDigestPayload } from "@notra/schemas/dashboard/workflows";
import { getStepMetadata } from "workflow";

import { flushContentEmailDigest } from "@/lib/workflows/shared/content-email-digest";
import { registerWorkflowRuntime } from "@/workflows/runtime";

export async function flushContentEmailDigestStep(
  payload: ContentEmailDigestPayload
): Promise<boolean> {
  "use step";
  await registerWorkflowRuntime();
  // The step id is unique per flush and stable across its retries.
  return flushContentEmailDigest(payload, getStepMetadata().stepId);
}
