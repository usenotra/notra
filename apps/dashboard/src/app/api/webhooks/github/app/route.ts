import { withEvlog } from "@notra/ai/evlog";
import { ingestGitHubAppMentionWebhook } from "@notra/ai/utils/github-mention-ingest";
import { after, type NextRequest } from "next/server";

import { writeMentionWebhookLog } from "@/lib/webhooks/github-mention-log";
import { startGitHubMentionRun } from "@/lib/workflows/start";

export const POST = withEvlog(async (request: NextRequest) => {
  const rawBody = await request.text();
  const deliveryId = request.headers.get("x-github-delivery");
  const result = await ingestGitHubAppMentionWebhook({
    event: request.headers.get("x-github-event"),
    signature: request.headers.get("x-hub-signature-256"),
    deliveryId,
    rawBody,
  });

  // No delivery claim exists until the durable run starts. A failed enqueue
  // fails the request; a redelivery can safely enqueue another competing run.
  if (result.context) {
    await startGitHubMentionRun(result.context);
  }

  if (result.log && !result.context) {
    const log = result.log;
    after(() => writeMentionWebhookLog(log, deliveryId));
  }

  return Response.json(result.body, { status: result.httpStatus });
});
