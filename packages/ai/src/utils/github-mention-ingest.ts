import {
  GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import { githubAppWebhookPayloadSchema } from "@notra/ai/schemas/github-mention";
import type {
  GitHubMentionContext,
  GitHubMentionProcessResult,
  GitHubMentionWebhookLog,
} from "@notra/ai/types/github-mention";
import {
  buildAcceptedMentionWebhookLog,
  buildUnauthorizedMentionWebhookLog,
  logGitHubMentionEvent,
} from "@notra/ai/utils/github-mention-log";
import {
  processGitHubMention,
  resolveGitHubMentionContext,
} from "@notra/ai/utils/github-mention-process";
import { verifyGitHubWebhookSignature } from "@notra/ai/utils/github-webhook-signature";
import { redis } from "@notra/ai/utils/redis";

const DELIVERY_TTL_SECONDS = 60 * 60 * 24;
const NOISY_IGNORE_REASONS = new Set([
  "not_mentioned",
  "bot_sender",
  "not_created",
  "missing_payload_fields",
]);

export function getGitHubAppWebhookSecret() {
  return process.env[GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV]?.trim() ?? "";
}

async function isDeliveryProcessed(deliveryId: string) {
  if (!(redis && deliveryId) || process.env.NODE_ENV === "development") {
    return false;
  }
  return (await redis.exists(`github-mention:delivery:${deliveryId}`)) === 1;
}

async function markDeliveryProcessed(deliveryId: string) {
  if (!(redis && deliveryId)) {
    return;
  }
  await redis.set(`github-mention:delivery:${deliveryId}`, "1", {
    ex: DELIVERY_TTL_SECONDS,
  });
}

function rejectIngest(
  httpStatus: number,
  body: Record<string, unknown>,
  reason: string,
  deliveryId: string | null
) {
  logGitHubMentionEvent(
    GITHUB_MENTION_LOG_EVENTS.ingestRejected,
    {
      httpStatus,
      reason,
      deliveryId,
    },
    httpStatus >= 500 ? "error" : "warn"
  );
  return { httpStatus, body };
}

export async function ingestGitHubAppMentionWebhook(params: {
  event: string | null;
  signature: string | null;
  deliveryId: string | null;
  rawBody: string;
}): Promise<{
  httpStatus: number;
  body: Record<string, unknown>;
  run?: () => Promise<GitHubMentionProcessResult>;
  context?: GitHubMentionContext;
  log?: GitHubMentionWebhookLog;
}> {
  if (!params.event) {
    return rejectIngest(
      400,
      { error: "Missing X-GitHub-Event header" },
      "missing_event",
      params.deliveryId
    );
  }

  if (params.event === "ping") {
    return {
      httpStatus: 200,
      body: { message: "Pong! GitHub App mention webhook configured" },
    };
  }

  if (params.event !== "issue_comment") {
    return {
      httpStatus: 200,
      body: { message: "ignored", event: params.event, ignored: true },
    };
  }

  const secret = getGitHubAppWebhookSecret();
  if (!secret) {
    return rejectIngest(
      500,
      { error: "GitHub App webhook secret is not configured" },
      "missing_secret",
      params.deliveryId
    );
  }

  if (!verifyGitHubWebhookSignature(params.rawBody, params.signature, secret)) {
    return rejectIngest(
      401,
      { error: "Invalid webhook signature" },
      "invalid_signature",
      params.deliveryId
    );
  }

  if (params.deliveryId && (await isDeliveryProcessed(params.deliveryId))) {
    logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.ignored, {
      deliveryId: params.deliveryId,
      reason: "duplicate",
    });
    return {
      httpStatus: 200,
      body: {
        message: "duplicate",
        delivery: params.deliveryId,
        duplicate: true,
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(params.rawBody);
  } catch {
    return rejectIngest(
      400,
      { error: "Invalid JSON payload" },
      "invalid_json",
      params.deliveryId
    );
  }

  const payload = githubAppWebhookPayloadSchema.safeParse(parsed);
  if (!payload.success) {
    return rejectIngest(
      400,
      { error: "Invalid webhook payload structure" },
      "invalid_payload",
      params.deliveryId
    );
  }

  const resolved = await resolveGitHubMentionContext({
    payload: payload.data,
    deliveryId: params.deliveryId,
  });

  if (resolved.status !== "ready") {
    if (params.deliveryId) {
      await markDeliveryProcessed(params.deliveryId);
    }
    const comment = payload.data.comment;
    const issue = payload.data.issue;
    const unauthorizedLog =
      resolved.status === "unauthorized" &&
      resolved.logTarget &&
      comment &&
      issue
        ? buildUnauthorizedMentionWebhookLog({
            target: resolved.logTarget,
            issueNumber: issue.number,
            senderLogin: payload.data.sender?.login ?? "unknown",
            commentUrl: comment.html_url,
            commentBody: comment.body,
          })
        : undefined;
    if (resolved.status === "unauthorized") {
      logGitHubMentionEvent(
        GITHUB_MENTION_LOG_EVENTS.unauthorized,
        {
          deliveryId: params.deliveryId,
          reason: resolved.reason,
          organizationId: resolved.logTarget?.organizationId ?? null,
          integrationId: resolved.logTarget?.integrationId ?? null,
          repository: resolved.logTarget
            ? `${resolved.logTarget.owner}/${resolved.logTarget.repo}`
            : null,
          issueNumber: issue?.number ?? null,
          senderLogin: payload.data.sender?.login ?? null,
        },
        "warn"
      );
    } else if (!NOISY_IGNORE_REASONS.has(resolved.reason)) {
      logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.ignored, {
        deliveryId: params.deliveryId,
        reason: resolved.reason,
      });
    }
    return {
      httpStatus: 200,
      body: { message: resolved.status, reason: resolved.reason },
      log: unauthorizedLog,
    };
  }

  if (params.deliveryId) {
    await markDeliveryProcessed(params.deliveryId);
  }

  const acceptedLog = buildAcceptedMentionWebhookLog(resolved.context);
  logGitHubMentionEvent(GITHUB_MENTION_LOG_EVENTS.accepted, {
    organizationId: resolved.context.organizationId,
    integrationId: resolved.context.integrationId,
    deliveryId: params.deliveryId,
    repository: `${resolved.context.owner}/${resolved.context.repo}`,
    issueNumber: resolved.context.issueNumber,
    senderLogin: resolved.context.sender.login,
    destinationMode: resolved.context.destination.mode,
    postId: resolved.context.publication?.postId ?? null,
  });

  return {
    httpStatus: 202,
    body: {
      message: "accepted",
      organizationId: resolved.context.organizationId,
      issue: resolved.context.issueNumber,
    },
    context: resolved.context,
    log: acceptedLog,
    run: () => processGitHubMention(resolved.context),
  };
}
