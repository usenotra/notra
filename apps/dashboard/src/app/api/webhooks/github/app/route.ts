import { GITHUB_MENTION_LOG_EVENTS } from "@notra/ai/constants/github-mention";
import { flushLogs, withEvlog } from "@notra/ai/evlog";
import type {
  GitHubMentionContext,
  GitHubMentionProcessResult,
  GitHubMentionWebhookLog,
} from "@notra/ai/types/github-mention";
import {
  ingestGitHubAppMentionWebhook,
  releaseGitHubMentionDelivery,
} from "@notra/ai/utils/github-mention-ingest";
import {
  buildMentionResultWebhookLog,
  logGitHubMentionEvent,
} from "@notra/ai/utils/github-mention-log";
import { after, type NextRequest } from "next/server";

import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { appendWebhookLog } from "@/lib/webhooks/logging";
import { startContentPublicationSyncRepair } from "@/lib/workflows/start";

// The mention agent runs in after() and can use the repo sandbox (up to 180 s).
export const maxDuration = 800;

async function writeMentionWebhookLog(
  log: GitHubMentionWebhookLog,
  deliveryId: string | null
) {
  // The Logs page entry is secondary: losing it must not drop the mention or
  // reopen a delivery that already ran.
  try {
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
  } catch (error) {
    logGitHubMentionEvent(
      GITHUB_MENTION_LOG_EVENTS.ingestRejected,
      {
        deliveryId,
        reason: "webhook_log_failed",
        error: error instanceof Error ? error.message : String(error),
      },
      "error"
    );
  }
}

async function runMention(
  run: () => Promise<GitHubMentionProcessResult>,
  context: GitHubMentionContext,
  deliveryId: string | null
): Promise<GitHubMentionProcessResult> {
  try {
    return await run();
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
    return { status: "failed", reason };
  }
}

export const POST = withEvlog(async (request: NextRequest) => {
  const rawBody = await request.text();
  const deliveryId = request.headers.get("x-github-delivery");
  const result = await ingestGitHubAppMentionWebhook({
    event: request.headers.get("x-github-event"),
    signature: request.headers.get("x-hub-signature-256"),
    deliveryId,
    rawBody,
    scheduleRepair: startContentPublicationSyncRepair,
  });

  if (result.log) {
    await writeMentionWebhookLog(result.log, deliveryId);
  }

  if (result.run && result.context) {
    const { run, context } = result;
    after(async () => {
      const startedAt = Date.now();
      try {
        const processed = await runMention(run, context, deliveryId);
        // A run that changed GitHub (a commit or reply) must not be redelivered.
        // Everything after this point is bookkeeping and cannot reopen it.
        if (processed.status === "failed" && !processed.reply) {
          await releaseGitHubMentionDelivery(deliveryId).catch(() => undefined);
        }
        await writeMentionWebhookLog(
          buildMentionResultWebhookLog({
            context,
            result: processed,
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
