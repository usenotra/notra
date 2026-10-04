import type { ContentEmailDigestPayload } from "@notra/schemas/dashboard/workflows";
import { getStepMetadata } from "workflow";

import { flushContentEmailDigest } from "@/lib/workflows/shared/content-email-digest";

export async function flushContentEmailDigestStep(
  payload: ContentEmailDigestPayload
): Promise<void> {
  "use step";
  // The step id is unique per run and stable across retries.
  await flushContentEmailDigest(payload, getStepMetadata().stepId);
}
