import type { ContentEmailDigestPayload } from "@notra/schemas/dashboard/workflows";

import { flushContentEmailDigest } from "@/lib/workflows/shared/content-email-digest";

export async function flushContentEmailDigestStep(
  payload: ContentEmailDigestPayload
): Promise<void> {
  "use step";
  await flushContentEmailDigest(payload);
}
