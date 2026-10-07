import { GITHUB_MENTION_LOG_EVENTS } from "@notra/ai/constants/github-mention";
import type { GitHubMentionWebhookLog } from "@notra/ai/types/github-mention";
import { logGitHubMentionEvent } from "@notra/ai/utils/github-mention-log";

import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { appendWebhookLog } from "@/lib/webhooks/logging";

export async function writeMentionWebhookLog(
  log: GitHubMentionWebhookLog,
  deliveryId: string | null
) {
  // Logs are secondary and must never replay a GitHub write.
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
