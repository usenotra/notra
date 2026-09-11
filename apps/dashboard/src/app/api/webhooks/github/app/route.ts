import { GITHUB_MENTION_LOG_EVENTS } from "@notra/ai/constants/github-mention";
import { flushLogs, withEvlog } from "@notra/ai/evlog";
import type { GitHubMentionWebhookLog } from "@notra/ai/types/github-mention";
import { ingestGitHubAppMentionWebhook } from "@notra/ai/utils/github-mention-ingest";
import {
  buildMentionResultWebhookLog,
  logGitHubMentionEvent,
} from "@notra/ai/utils/github-mention-log";
import { after, type NextRequest } from "next/server";

import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { appendWebhookLog } from "@/lib/webhooks/logging";

async function writeMentionWebhookLog(
  log: GitHubMentionWebhookLog,
  deliveryId: string | null
) {
  const retentionDays = await checkLogRetention(log.organizationId);
  await appendWebhookLog({
    organizationId: log.organizationId,
    integrationId: log.integrationId,
    integrationType: "github",
    title: log.title,
    status: log.status,
    statusCode: log.statusCode,
    errorMessage: log.errorMessage,
    payload: log.payload,
    referenceId: deliveryId,
    retentionDays,
  });
}

export const POST = withEvlog(async (request: NextRequest) => {
  const rawBody = await request.text();
  const deliveryId = request.headers.get("x-github-delivery");
  const result = await ingestGitHubAppMentionWebhook({
    event: request.headers.get("x-github-event"),
    signature: request.headers.get("x-hub-signature-256"),
    deliveryId,
    rawBody,
  });

  if (result.log) {
    await writeMentionWebhookLog(result.log, deliveryId);
  }

  if (result.run && result.context) {
    const context = result.context;
    after(async () => {
      const startedAt = Date.now();
      try {
        const processed = await result.run?.();
        if (processed) {
          await writeMentionWebhookLog(
            buildMentionResultWebhookLog({
              context,
              result: processed,
              durationMs: Date.now() - startedAt,
            }),
            deliveryId
          );
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logGitHubMentionEvent(
          GITHUB_MENTION_LOG_EVENTS.completed,
          {
            organizationId: context.organizationId,
            integrationId: context.integrationId,
            deliveryId,
            repository: `${context.owner}/${context.repo}`,
            issueNumber: context.issueNumber,
            mentionStatus: "failed",
            reason,
          },
          "error"
        );
        await writeMentionWebhookLog(
          buildMentionResultWebhookLog({
            context,
            result: { status: "failed", reason },
            durationMs: Date.now() - startedAt,
          }),
          deliveryId
        );
      } finally {
        await flushLogs().catch(() => undefined);
      }
    });
  }

  return Response.json(result.body, { status: result.httpStatus });
});
