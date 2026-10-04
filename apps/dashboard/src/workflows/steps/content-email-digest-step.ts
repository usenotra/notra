import "@/workflows/runtime";
import type { ContentEmailDigestPayload } from "@notra/schemas/dashboard/workflows";
import { getStepMetadata } from "workflow";

import { flushContentEmailDigest } from "@/lib/workflows/shared/content-email-digest";

export async function flushContentEmailDigestStep(
  payload: ContentEmailDigestPayload
): Promise<boolean> {
  "use step";
  // The step id is unique per flush and stable across its retries.
  return flushContentEmailDigest(payload, getStepMetadata().stepId);
}
