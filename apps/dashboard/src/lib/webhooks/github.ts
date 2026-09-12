import crypto from "node:crypto";

import {
  GITHUB_PULL_REQUEST_EVENT_TYPE,
  GITHUB_PULL_REQUEST_MERGED_ACTION,
} from "@notra/ai/constants/autonomy-signals";
import { getWebhookSecretByRepositoryId } from "@notra/ai/integrations/github";
import { redis } from "@notra/ai/utils/redis";
import { db } from "@notra/db/drizzle";
import { contentTriggers } from "@notra/db/schema";
import {
  type GitHubEventType,
  type GitHubWebhookPayload,
  githubWebhookPayloadSchema,
  isGitHubEventType,
} from "@notra/schemas/dashboard/github-webhook";
import { and, eq, sql } from "drizzle-orm";

import { GITHUB_PULL_REQUEST_CLOSED_ACTION } from "@/constants/github";
import { checkLogRetention } from "@/lib/billing/check-log-retention";
import { dispatchIrisGithubSignal } from "@/lib/iris/record-github-signal";
import { dispatchEventTriggers } from "@/lib/webhooks/dispatch-event-triggers";
import { appendWebhookLog } from "@/lib/webhooks/logging";
import type {
  GithubCreateMemoryEntryProps,
  GithubMemoryEventType,
  GithubProcessedEvent,
  WebhookContext,
} from "@/types/webhooks/webhooks";

const DELIVERY_TTL_SECONDS = 60 * 60 * 24;
const SHOULD_DEDUPE_DELIVERIES = process.env.NODE_ENV !== "development";

async function isDeliveryProcessed(deliveryId: string) {
  if (!(redis && deliveryId)) {
    return false;
  }
  const key = `webhook:delivery:${deliveryId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

async function markDeliveryProcessed(deliveryId: string) {
  if (!(redis && deliveryId)) {
    return;
  }
  const key = `webhook:delivery:${deliveryId}`;
  await redis.set(key, "1", { ex: DELIVERY_TTL_SECONDS });
}

function getRepositoryName(payload: GitHubWebhookPayload) {
  return payload.repository?.full_name ?? "unknown";
}

const IRIS_SIGNAL_RETRY_STATUS = 500;

function buildIrisSignalRetryResponse(event: string, delivery: string | null) {
  return Response.json(
    {
      message: "Failed to record the Iris signal for this delivery",
      event,
      delivery,
    },
    { status: IRIS_SIGNAL_RETRY_STATUS }
  );
}

async function createMemoryEntry({
  organizationId,
  eventType,
  repository,
  action,
  data,
  customId,
}: GithubCreateMemoryEntryProps) {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    return null;
  }

  const content = JSON.stringify({ eventType, repository, action, data });
  const context = `GitHub ${eventType} event for ${repository} (${action}).`;

  if (!content.trim()) {
    return null;
  }

  const response = await fetch("https://api.supermemory.ai/v3/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: content.trim(),
      context,
      containerTag: organizationId,
      customId,
      metadata: {
        source: "github_webhook",
        eventType,
        repository,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to add memory: ${errorBody}`);
  }

  return response.json();
}

function verifySignature(payload: string, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function isDefaultBranchRef(ref: string, defaultBranch: string) {
  return ref === `refs/heads/${defaultBranch}`;
}

function processReleaseEvent(
  action: string,
  payload: GitHubWebhookPayload
): GithubProcessedEvent | null {
  const validActions = ["published", "prereleased"];
  if (!validActions.includes(action)) {
    return null;
  }

  const release = payload.release;
  if (!release) {
    return null;
  }

  if (release.draft && action !== "created") {
    return null;
  }

  return {
    type: "release",
    action,
    data: {
      tagName: release.tag_name,
      name: release.name,
      body: release.body,
      prerelease: release.prerelease,
      draft: release.draft,
      publishedAt: release.published_at,
      url: release.html_url,
    },
  };
}

function processPushEvent(
  payload: GitHubWebhookPayload
): GithubProcessedEvent | null {
  const ref = payload.ref;
  const defaultBranch = payload.repository?.default_branch;
  const commits = payload.commits;

  if (!(ref && defaultBranch)) {
    return null;
  }

  if (!isDefaultBranchRef(ref, defaultBranch)) {
    return null;
  }

  if (!commits || commits.length === 0) {
    return null;
  }

  return {
    type: "push",
    action: "pushed",
    data: {
      ref,
      branch: defaultBranch,
      commits: commits.map((c) => ({
        id: c.id,
        message: c.message,
        author: c.author,
        timestamp: c.timestamp,
        url: c.url,
      })),
      headCommit: payload.head_commit
        ? {
            id: payload.head_commit.id,
            message: payload.head_commit.message,
          }
        : null,
    },
  };
}

function processPullRequestEvent(
  action: string,
  payload: GitHubWebhookPayload
): GithubProcessedEvent | null {
  if (action !== GITHUB_PULL_REQUEST_CLOSED_ACTION) {
    return null;
  }

  const pullRequest = payload.pull_request;
  if (!pullRequest?.merged) {
    return null;
  }

  return {
    type: GITHUB_PULL_REQUEST_EVENT_TYPE,
    action: GITHUB_PULL_REQUEST_MERGED_ACTION,
    data: {
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body ?? null,
      url: pullRequest.html_url,
      mergedAt: pullRequest.merged_at ?? null,
      mergeCommitSha: pullRequest.merge_commit_sha ?? null,
      author: pullRequest.user?.login ?? null,
      baseBranch: pullRequest.base?.ref ?? null,
    },
  };
}

export async function handleGitHubWebhook(
  context: WebhookContext
): Promise<Response> {
  const { request, rawBody, repositoryId, organizationId, integrationId } =
    context;

  const eventHeader = request.headers.get("x-github-event");
  const signature = request.headers.get("x-hub-signature-256");
  const delivery = request.headers.get("x-github-delivery");

  if (!eventHeader) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Missing webhook event header",
      status: "failed",
      statusCode: 400,
      referenceId: delivery ?? null,
      errorMessage: "Missing X-GitHub-Event header",
    });

    return Response.json(
      { error: "Missing X-GitHub-Event header" },
      { status: 400 }
    );
  }

  if (!isGitHubEventType(eventHeader)) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: `Unsupported event type: ${eventHeader}`,
      status: "success",
      statusCode: 200,
      referenceId: delivery ?? null,
      payload: { event: eventHeader, ignored: true },
    });

    return Response.json({
      message: `Event type '${eventHeader}' is not supported`,
      event: eventHeader,
      ignored: true,
    });
  }

  const event: GitHubEventType = eventHeader;

  if (
    SHOULD_DEDUPE_DELIVERIES &&
    delivery &&
    (await isDeliveryProcessed(delivery))
  ) {
    return Response.json({
      message: "Webhook already processed (duplicate delivery)",
      event,
      delivery,
      duplicate: true,
    });
  }

  const secret = await getWebhookSecretByRepositoryId(repositoryId);
  if (!secret) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Webhook secret missing",
      status: "failed",
      statusCode: 400,
      referenceId: delivery ?? null,
      errorMessage: "Webhook secret not configured",
    });

    return Response.json(
      { error: "Webhook secret not configured for this repository" },
      { status: 400 }
    );
  }

  if (!signature) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Signature missing",
      status: "failed",
      statusCode: 400,
      referenceId: delivery ?? null,
      errorMessage: "Missing X-Hub-Signature-256 header",
    });

    return Response.json(
      { error: "Missing X-Hub-Signature-256 header" },
      { status: 400 }
    );
  }

  if (!verifySignature(rawBody, signature, secret)) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Invalid webhook signature",
      status: "failed",
      statusCode: 401,
      referenceId: delivery ?? null,
      errorMessage: "Invalid webhook signature",
    });

    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const logRetentionDays = await checkLogRetention(organizationId);

  if (event === "ping") {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Webhook ping received",
      status: "success",
      statusCode: 200,
      referenceId: delivery ?? null,
      payload: { event: "ping" },
      retentionDays: logRetentionDays,
    });

    return Response.json({
      message: "Pong! Webhook configured successfully",
      event: "ping",
      delivery,
    });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Invalid webhook payload",
      status: "failed",
      statusCode: 400,
      referenceId: delivery ?? null,
      errorMessage: "Invalid JSON payload",
      retentionDays: logRetentionDays,
    });

    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validation = githubWebhookPayloadSchema.safeParse(parsedBody);
  if (!validation.success) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: "Invalid webhook payload structure",
      status: "failed",
      statusCode: 400,
      referenceId: delivery ?? null,
      errorMessage: `Payload validation failed: ${validation.error.issues.map((i) => i.message).join(", ")}`,
      retentionDays: logRetentionDays,
    });

    return Response.json(
      { error: "Invalid webhook payload structure" },
      { status: 400 }
    );
  }

  const payload = validation.data;
  const action = payload.action ?? "";

  let processedEvent: GithubProcessedEvent | null = null;

  switch (event) {
    case "release":
      processedEvent = processReleaseEvent(action, payload);
      break;
    case "push":
      processedEvent = processPushEvent(payload);
      break;
    case "pull_request":
      processedEvent = processPullRequestEvent(action, payload);
      break;
    default:
      await appendWebhookLog({
        organizationId,
        integrationId,
        integrationType: "github",
        title: `Ignored ${event} event`,
        status: "success",
        statusCode: 200,
        referenceId: delivery ?? null,
        payload: { event, action, ignored: true },
        retentionDays: logRetentionDays,
      });

      return Response.json({
        message: `Event type '${event}' is not processed`,
        event,
        action,
        ignored: true,
      });
  }

  if (!processedEvent) {
    await appendWebhookLog({
      organizationId,
      integrationId,
      integrationType: "github",
      title: `Filtered ${event} event`,
      status: "success",
      statusCode: 200,
      referenceId: delivery ?? null,
      payload: { event, action, filtered: true },
      retentionDays: logRetentionDays,
    });

    return Response.json({
      message: `Event '${event}' with action '${action}' was filtered out`,
      event,
      action,
      filtered: true,
    });
  }

  const repositoryName = getRepositoryName(payload);
  const shouldPersistMemory =
    processedEvent.type === "release" || processedEvent.type === "push";

  if (shouldPersistMemory) {
    const customId = `github:${repositoryId}:${delivery ?? crypto.randomUUID()}`;
    await createMemoryEntry({
      organizationId,
      eventType: processedEvent.type as GithubMemoryEventType,
      repository: repositoryName,
      action: processedEvent.action,
      data: processedEvent.data,
      customId,
    });
  }

  await appendWebhookLog({
    organizationId,
    integrationId,
    integrationType: "github",
    title: `Processed ${processedEvent.type} event`,
    status: "success",
    statusCode: 200,
    referenceId: delivery ?? null,
    payload: {
      event,
      action: processedEvent.action,
      data: processedEvent.data,
    },
    retentionDays: logRetentionDays,
  });

  const irisSignalRecorded = await dispatchIrisGithubSignal({
    organizationId,
    repositoryId,
    repositoryName,
    eventType: processedEvent.type,
    eventAction: processedEvent.action,
    eventData: processedEvent.data,
    deliveryId: delivery,
  });

  if (processedEvent.type === GITHUB_PULL_REQUEST_EVENT_TYPE) {
    if (!irisSignalRecorded) {
      return buildIrisSignalRetryResponse(event, delivery);
    }

    if (SHOULD_DEDUPE_DELIVERIES && delivery) {
      await markDeliveryProcessed(delivery);
    }

    return Response.json({
      message: `Processed ${processedEvent.type} event (${processedEvent.action})`,
      event,
      delivery,
      processed: processedEvent,
      repository: {
        id: payload.repository?.id,
        fullName: payload.repository?.full_name,
      },
    });
  }

  const matchingTriggers = await db
    .select({
      id: contentTriggers.id,
      sourceConfig: contentTriggers.sourceConfig,
    })
    .from(contentTriggers)
    .where(
      and(
        eq(contentTriggers.organizationId, organizationId),
        eq(contentTriggers.sourceType, "github_webhook"),
        eq(contentTriggers.enabled, true),
        sql`(${contentTriggers.targets}->'repositoryIds') @> ${JSON.stringify([repositoryId])}::jsonb`
      )
    );

  await dispatchEventTriggers({
    triggers: matchingTriggers,
    processedEvent,
    repositoryId,
    deliveryId: delivery ?? undefined,
  });

  if (!irisSignalRecorded) {
    return buildIrisSignalRetryResponse(event, delivery);
  }

  if (SHOULD_DEDUPE_DELIVERIES && delivery) {
    await markDeliveryProcessed(delivery);
  }

  return Response.json({
    message: `Processed ${processedEvent.type} event (${processedEvent.action})`,
    event,
    delivery,
    processed: processedEvent,
    repository: {
      id: payload.repository?.id,
      fullName: payload.repository?.full_name,
    },
  });
}
