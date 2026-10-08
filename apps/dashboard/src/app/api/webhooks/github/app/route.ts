import { withEvlog } from "@notra/ai/evlog";
import {
  getGitHubAppWebhookSecret,
  ingestGitHubAppMentionWebhook,
} from "@notra/ai/utils/github-mention-ingest";

import { SITES_ONLY_GITHUB_EVENTS } from "@/constants/sites";
import { afterResponse } from "@/lib/framework/after-response";
import { writeMentionWebhookLog } from "@/lib/webhooks/github-mention-log";
import { startGitHubMentionRun } from "@/lib/workflows/start";

export const POST = withEvlog(async (request: Request) => {
  const rawBody = await request.text();
  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  let sitesFailed = false;
  const secret = getGitHubAppWebhookSecret();
  if (event && secret) {
    try {
      const [{ handleSitesWebhook }, { dispatchSiteJobs }] = await Promise.all([
        import("@notra/sites-server/webhooks"),
        import("@/lib/sites/dispatch"),
      ]);
      const sites = await handleSitesWebhook({
        event,
        deliveryId,
        signature,
        rawBody,
        secret,
      });
      if (sites) {
        if (sites.jobIds.length > 0) {
          const jobIds = sites.jobIds;
          afterResponse(() => dispatchSiteJobs(jobIds));
        }
        if (SITES_ONLY_GITHUB_EVENTS.has(event) || sites.httpStatus >= 400) {
          return Response.json(sites.body, { status: sites.httpStatus });
        }
      }
    } catch (error) {
      console.error("sites.webhook_failed", {
        deliveryId,
        event,
        error: error instanceof Error ? error.message : error,
      });
      if (event && SITES_ONLY_GITHUB_EVENTS.has(event)) {
        return Response.json(
          { error: "Sites webhook failed" },
          { status: 500 }
        );
      }
      sitesFailed = true;
    }
  }

  const result = await ingestGitHubAppMentionWebhook({
    event,
    signature,
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
    afterResponse(() => writeMentionWebhookLog(log, deliveryId));
  }

  if (sitesFailed) {
    return Response.json({ error: "Sites webhook failed" }, { status: 500 });
  }
  return Response.json(result.body, { status: result.httpStatus });
});
