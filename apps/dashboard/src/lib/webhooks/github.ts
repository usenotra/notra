import crypto from "crypto";
import { generateText } from "ai";
import { appendWebhookLog } from "@/lib/webhooks/logging";
import { getGithubWebhookMemoryPrompt } from "@/lib/ai/prompts/github-webhook-memory";
import { openrouter } from "@/lib/openrouter";
import { getWebhookSecretByRepositoryId } from "@/lib/services/github-integration";
import type { WebhookContext, WebhookResult } from "@/types/webhooks";

// Event types we care about (see docs/github-webhook-events.md)
type GitHubEventType = "release" | "push" | "star" | "ping";

type MemoryEventType = Exclude<GitHubEventType, "ping">;

const STAR_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

interface GitHubWebhookPayload {
  action?: string;
  ref?: string;
  ref_type?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
    owner: {
      login: string;
    };
    stargazers_count?: number;
  };
  star_count?: number;
  sender?: {
    login: string;
    id: number;
  };
  release?: {
    tag_name: string;
    name: string | null;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    published_at: string | null;
    html_url: string;
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
      username?: string;
    };
    timestamp: string;
    url: string;
  }>;
  head_commit?: {
    id: string;
    message: string;
  };
  starred_at?: string;
}

interface ProcessedEvent {
  type: string;
  action: string;
  data: Record<string, unknown>;
}

function isStarMilestone(stars?: number) {
  if (!stars) {
    return false;
  }
  return STAR_MILESTONES.includes(stars);
}

function getRepositoryName(payload: GitHubWebhookPayload) {
  return payload.repository?.full_name ?? "unknown";
}

async function createMemoryEntry({
  organizationId,
  eventType,
  repository,
  action,
  data,
  customId,
}: {
  organizationId: string;
  eventType: MemoryEventType;
  repository: string;
  action: string;
  data: Record<string, unknown>;
  customId: string;
}) {
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  if (!apiKey) {
    return null;
  }

  const { system, user } = getGithubWebhookMemoryPrompt({
    eventType,
    repository,
    action,
    data,
  });

  const { text } = await generateText({
    model: openrouter("google/gemini-3-flash-preview"),
    system,
    prompt: user,
  });

  if (!text.trim()) {
    return null;
  }

  const response = await fetch("https://api.supermemory.ai/v3/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: text.trim(),
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

function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);
  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function isDefaultBranchRef(ref: string, defaultBranch: string): boolean {
  return ref === `refs/heads/${defaultBranch}`;
}

function processReleaseEvent(
  action: string,
  payload: GitHubWebhookPayload,
): ProcessedEvent | null {
  // Only process published, created, edited, prereleased
  const validActions = ["published", "created", "edited", "prereleased"];
  if (!validActions.includes(action)) {
    return null;
  }

  const release = payload.release;
  if (!release) {
    return null;
  }

  // Skip drafts unless they were just created
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
  payload: GitHubWebhookPayload,
): ProcessedEvent | null {
  const ref = payload.ref;
  const defaultBranch = payload.repository?.default_branch;
  const commits = payload.commits;

  if (!ref || !defaultBranch) {
    return null;
  }

  // Only process pushes to default branch
  if (!isDefaultBranchRef(ref, defaultBranch)) {
    return null;
  }

  // Ignore empty pushes (force push with no new commits)
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

function processStarEvent(
  action: string,
  payload: GitHubWebhookPayload,
): ProcessedEvent | null {
  // Only process star creation
  if (action !== "created") {
    return null;
  }

  const stargazersCount =
    payload.repository?.stargazers_count ?? payload.star_count;

  return {
    type: "star",
    action: "created",
    data: {
      starredAt: payload.starred_at,
      user: payload.sender?.login,
      stargazersCount,
    },
  };
}

export async function handleGitHubWebhook(
  context: WebhookContext,
): Promise<WebhookResult> {
  const { request, rawBody, repositoryId, organizationId, integrationId } =
    context;

  const event = request.headers.get("x-github-event") as GitHubEventType | null;
  const signature = request.headers.get("x-hub-signature-256");
  const delivery = request.headers.get("x-github-delivery");

  if (!event) {
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

    return {
      success: false,
      message: "Missing X-GitHub-Event header",
    };
  }

  // Handle ping event (sent when webhook is first configured)
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
    });

    return {
      success: true,
      message: "Pong! Webhook configured successfully",
      data: { event: "ping", delivery },
    };
  }

  // Verify signature
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

    return {
      success: false,
      message: "Webhook secret not configured for this repository",
    };
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

    return {
      success: false,
      message: "Missing X-Hub-Signature-256 header",
    };
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

    return {
      success: false,
      message: "Invalid webhook signature",
    };
  }

  // Parse payload
  let payload: GitHubWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
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
    });

    return {
      success: false,
      message: "Invalid JSON payload",
    };
  }

  const action = payload.action ?? "";

  // Process event based on type
  let processedEvent: ProcessedEvent | null = null;

  switch (event) {
    case "release":
      processedEvent = processReleaseEvent(action, payload);
      break;
    case "push":
      processedEvent = processPushEvent(payload);
      break;
    case "star":
      processedEvent = processStarEvent(action, payload);
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
      });

      // Unhandled event type - acknowledge but don't process
      return {
        success: true,
        message: `Event type '${event}' is not processed`,
        data: { event, action, ignored: true },
      };
  }

  // Event was filtered out (e.g., push to non-default branch)
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
    });

    return {
      success: true,
      message: `Event '${event}' with action '${action}' was filtered out`,
      data: { event, action, filtered: true },
    };
  }

  // TODO: Store the processed event in the database
  // TODO: Trigger any workflows based on the event

  const repositoryName = getRepositoryName(payload);
  const stargazersCount = processedEvent.data.stargazersCount as
    | number
    | undefined;

  const shouldPersistMemory =
    processedEvent.type === "release" ||
    processedEvent.type === "push" ||
    (processedEvent.type === "star" && isStarMilestone(stargazersCount));

  if (shouldPersistMemory) {
    const customId = `github:${repositoryId}:${delivery ?? crypto.randomUUID()}`;
    await createMemoryEntry({
      organizationId,
      eventType: processedEvent.type as MemoryEventType,
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
  });

  return {
    success: true,
    message: `Processed ${processedEvent.type} event (${processedEvent.action})`,
    data: {
      event,
      delivery,
      processed: processedEvent,
      repository: {
        id: payload.repository?.id,
        fullName: payload.repository?.full_name,
      },
    },
  };
}
