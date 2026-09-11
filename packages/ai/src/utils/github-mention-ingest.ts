import { GITHUB_MENTION_APP_WEBHOOK_SECRET_ENV } from "@notra/ai/constants/github-mention";
import { githubAppWebhookPayloadSchema } from "@notra/ai/schemas/github-mention";
import type { GitHubMentionProcessResult } from "@notra/ai/types/github-mention";
import {
  processGitHubMention,
  resolveGitHubMentionContext,
} from "@notra/ai/utils/github-mention-process";
import { verifyGitHubWebhookSignature } from "@notra/ai/utils/github-webhook-signature";
import { redis } from "@notra/ai/utils/redis";

const DELIVERY_TTL_SECONDS = 60 * 60 * 24;

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

export async function ingestGitHubAppMentionWebhook(params: {
  event: string | null;
  signature: string | null;
  deliveryId: string | null;
  rawBody: string;
}): Promise<{
  httpStatus: number;
  body: Record<string, unknown>;
  run?: () => Promise<GitHubMentionProcessResult>;
}> {
  if (!params.event) {
    return {
      httpStatus: 400,
      body: { error: "Missing X-GitHub-Event header" },
    };
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
    return {
      httpStatus: 500,
      body: { error: "GitHub App webhook secret is not configured" },
    };
  }

  if (!verifyGitHubWebhookSignature(params.rawBody, params.signature, secret)) {
    return {
      httpStatus: 401,
      body: { error: "Invalid webhook signature" },
    };
  }

  if (params.deliveryId && (await isDeliveryProcessed(params.deliveryId))) {
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
    return { httpStatus: 400, body: { error: "Invalid JSON payload" } };
  }

  const payload = githubAppWebhookPayloadSchema.safeParse(parsed);
  if (!payload.success) {
    return {
      httpStatus: 400,
      body: { error: "Invalid webhook payload structure" },
    };
  }

  const resolved = await resolveGitHubMentionContext({
    payload: payload.data,
    deliveryId: params.deliveryId,
  });

  if (resolved.status !== "ready") {
    if (params.deliveryId) {
      await markDeliveryProcessed(params.deliveryId);
    }
    return {
      httpStatus: 200,
      body: { message: resolved.status, reason: resolved.reason },
    };
  }

  if (params.deliveryId) {
    await markDeliveryProcessed(params.deliveryId);
  }

  return {
    httpStatus: 202,
    body: {
      message: "accepted",
      organizationId: resolved.context.organizationId,
      issue: resolved.context.issueNumber,
    },
    run: () => processGitHubMention(resolved.context),
  };
}
