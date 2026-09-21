import { flushLogs } from "@notra/ai/evlog";
import type {
  GitHubMentionContext,
  GitHubMentionProcessResult,
} from "@notra/ai/types/github-mention";
import {
  claimGitHubMentionDelivery,
  completeGitHubMentionDelivery,
} from "@notra/ai/utils/github-mention-delivery";
import {
  buildAcceptedMentionWebhookLog,
  buildMentionResultWebhookLog,
} from "@notra/ai/utils/github-mention-log";
import { processGitHubMention } from "@notra/ai/utils/github-mention-process";

import { writeMentionWebhookLog } from "@/lib/webhooks/github-mention-log";
import { startContentPublicationSyncRepair } from "@/lib/workflows/start";

export async function claimGitHubMentionStep(
  context: GitHubMentionContext,
  runId: string
) {
  "use step";
  if (!context.deliveryId) {
    throw new Error("GitHub mention delivery ID is required");
  }
  return await claimGitHubMentionDelivery(context.deliveryId, runId);
}

export async function processGitHubMentionStep(context: GitHubMentionContext) {
  "use step";
  await writeMentionWebhookLog(
    buildAcceptedMentionWebhookLog(context),
    context.deliveryId
  );
  return await processGitHubMention(context, startContentPublicationSyncRepair);
}

// A killed attempt may have committed or replied before its result persisted.
// Replaying the whole agent is unsafe; it must be reconciled first.
processGitHubMentionStep.maxRetries = 0;

export async function completeGitHubMentionStep(
  context: GitHubMentionContext,
  runId: string
) {
  "use step";
  if (!context.deliveryId) {
    throw new Error("GitHub mention delivery ID is required");
  }
  await completeGitHubMentionDelivery(context.deliveryId, runId);
}

export async function logGitHubMentionResultStep(
  context: GitHubMentionContext,
  result: GitHubMentionProcessResult,
  durationMs: number
) {
  "use step";
  await writeMentionWebhookLog(
    buildMentionResultWebhookLog({ context, result, durationMs }),
    context.deliveryId
  );
  await flushLogs().catch(() => undefined);
}
