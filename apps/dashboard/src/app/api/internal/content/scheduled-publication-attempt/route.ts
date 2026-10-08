import { scheduledPublicationAttemptRequestSchema } from "@notra/schemas/dashboard/workflows/scheduled-publication-wake";

import { runScheduledPublicationAttempt } from "@/lib/content/scheduled-publication-attempt";
import { verifyInternalWorkflowRequest } from "@/lib/workflows/internal-auth";

/**
 * Publishes one claimed scheduled publication for the workflow step. The step
 * cannot run the destinations itself; see `runScheduledPublicationAttempt`.
 * Destination errors come back in the outcome; a thrown error is a 500 and
 * the step retries the call.
 */
export async function POST(request: Request) {
  if (!(await verifyInternalWorkflowRequest(request))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const parsed = scheduledPublicationAttemptRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  const result = await runScheduledPublicationAttempt(parsed.data);
  return Response.json({ result });
}
