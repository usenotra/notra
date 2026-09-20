import {
  GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV,
  GITHUB_MENTION_LOG_EVENTS,
} from "@notra/ai/constants/github-mention";
import { githubAppWebhookPayloadSchema } from "@notra/ai/schemas/github-mention";
import type {
  GitHubAppWebhookPayload,
  GitHubMentionContext,
  GitHubMentionProcessResult,
  GitHubMentionWebhookLog,
} from "@notra/ai/types/github-mention";
import { closeContentPublicationForPullRequest } from "@notra/ai/utils/content-publication";
import { resolveGitHubMentionContext } from "@notra/ai/utils/github-mention-context";
import {
  buildAcceptedMentionWebhookLog,
  buildUnauthorizedMentionWebhookLog,
  logGitHubMentionEvent,
} from "@notra/ai/utils/github-mention-log";
import { processGitHubMention } from "@notra/ai/utils/github-mention-process";
import { verifyGitHubWebhookSignature } from "@notra/ai/utils/github-webhook-signature";
import { redis } from "@notra/ai/utils/redis";

const DELIVERY_TTL_SECONDS = 60 * 60 * 24;

function deliveryLockKey(deliveryId: string) {
  return `github-mention:delivery:${deliveryId}`;
}
const HANDLED_EVENTS = new Set([
  "issue_comment",
  // Mentions in review threads under "Files changed".
  "pull_request_review_comment",
  "pull_request",
]);
const NOISY_IGNORE_REASONS = new Set([
  "not_mentioned",
  "bot_sender",
  "not_created",
  "missing_payload_fields",
]);

export function getGitHubAppWebhookSecret() {
  return process.env[GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV]?.trim() ?? "";
}

/** Atomically claims a delivery so concurrent redeliveries run only once. */
async function claimDelivery(deliveryId: string) {
  if (!(redis && deliveryId) || process.env.NODE_ENV === "development") {
    return true;
  }
  const claimed = await redis.set(deliveryLockKey(deliveryId), "1", {
    nx: true,
    ex: DELIVERY_TTL_SECONDS,
  });
  return claimed === "OK";
}

/**
 * Drops a claim whose mention was not handled (ingest error, failed run), so
 * redelivering the webhook from the GitHub App settings runs it again instead
 * of answering "duplicate".
 */
export async function releaseGitHubMentionDelivery(deliveryId: string | null) {
  if (!(redis && deliveryId) || process.env.NODE_ENV === "development") {
    return;
  }
  await redis.del(deliveryLockKey(deliveryId));
}

async function syncClosedPullRequestPublication(
  payload: GitHubAppWebhookPayload
) {
  const pullRequest = payload.pull_request;
  const repository = payload.repository;
  if (payload.action !== "closed" || !(pullRequest && repository)) {
    return {
      httpStatus: 200,
      body: { message: "ignored", event: "pull_request", ignored: true },
    };
  }
  const updated = await closeContentPublicationForPullRequest({
    owner: repository.owner.login,
    repo: repository.name,
    pullRequestNumber: pullRequest.number,
    merged: Boolean(pullRequest.merged),
  });
  return {
    httpStatus: 200,
    body: { message: "publication_synced", updated },
  };
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

  if (params.event !== "ping" && !HANDLED_EVENTS.has(params.event)) {
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

  if (params.event === "ping") {
    return {
      httpStatus: 200,
      body: { message: "Pong! GitHub App mention webhook configured" },
    };
  }

  if (!verifyGitHubWebhookSignature(params.rawBody, params.signature, secret)) {
    return rejectIngest(
      401,
      { error: "Invalid webhook signature" },
      "invalid_signature",
      params.deliveryId
    );
  }

  if (params.deliveryId && !(await claimDelivery(params.deliveryId))) {
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

  try {
    const result = await finishIngest({
      event: params.event,
      signature: params.signature,
      deliveryId: params.deliveryId,
      rawBody: params.rawBody,
    });
    if (result.httpStatus >= 500) {
      await releaseGitHubMentionDelivery(params.deliveryId);
    }
    return result;
  } catch (error) {
    await releaseGitHubMentionDelivery(params.deliveryId);
    throw error;
  }
}

async function finishIngest(params: {
  event: string;
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

  if (params.event === "pull_request") {
    return await syncClosedPullRequestPublication(payload.data);
  }

  // GitHub sends PR conversation comments as issue_comment too. Only those
  // have issue.pull_request; ordinary issues must never start an agent run.
  if (params.event === "issue_comment" && !payload.data.issue?.pull_request) {
    return {
      httpStatus: 200,
      body: { message: "ignored", reason: "not_pull_request" },
    };
  }

  const resolved = await resolveGitHubMentionContext({
    payload: payload.data,
    deliveryId: params.deliveryId,
  });

  if (resolved.status !== "ready") {
    const comment = payload.data.comment;
    const issueNumber =
      payload.data.issue?.number ?? payload.data.pull_request?.number;
    const unauthorizedLog =
      resolved.status === "unauthorized" &&
      resolved.logTarget &&
      comment &&
      issueNumber
        ? buildUnauthorizedMentionWebhookLog({
            target: resolved.logTarget,
            issueNumber,
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
          issueNumber: issueNumber ?? null,
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
