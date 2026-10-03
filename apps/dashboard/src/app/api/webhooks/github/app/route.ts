import { withEvlog } from "@notra/ai/evlog";
import {
  getGitHubAppWebhookSecret,
  ingestGitHubAppMentionWebhook,
} from "@notra/ai/utils/github-mention-ingest";
import { handleSitesWebhook } from "@notra/sites-server/webhooks";
import { after, type NextRequest } from "next/server";

import { dispatchSiteJobs } from "@/lib/sites/dispatch";
import { writeMentionWebhookLog } from "@/lib/webhooks/github-mention-log";
import { startGitHubMentionRun } from "@/lib/workflows/start";

/** Events only Sites consumes; `pull_request` goes to both Sites and mentions. */
const SITES_ONLY_EVENTS = new Set(["push", "check_run"]);

export const POST = withEvlog(async (request: NextRequest) => {
  const rawBody = await request.text();
  const deliveryId = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");

  // Notra Sites: deployments and previews. Its outbox rows are committed before
  // we answer, so dispatching after the response cannot lose work.
  let sitesFailed = false;
  // Same (trimmed) secret as the mention path, so both verify a delivery identically.
  const secret = getGitHubAppWebhookSecret();
  if (event && secret) {
    try {
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
          after(() => dispatchSiteJobs(jobIds));
        }
        if (SITES_ONLY_EVENTS.has(event) || sites.httpStatus >= 400) {
          return Response.json(sites.body, { status: sites.httpStatus });
        }
      }
    } catch (error) {
      console.error("sites.webhook_failed", {
        deliveryId,
        event,
        error: error instanceof Error ? error.message : error,
      });
      if (event && SITES_ONLY_EVENTS.has(event)) {
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
    after(() => writeMentionWebhookLog(log, deliveryId));
  }

  // GitHub redelivers on 5xx; Sites released its delivery claim, mentions dedupe on their own.
  if (sitesFailed) {
    return Response.json({ error: "Sites webhook failed" }, { status: 500 });
  }
  return Response.json(result.body, { status: result.httpStatus });
});
