import {
  AGENT_AUTO_PUBLISH_HEADER,
  AGENT_BRAND_AGENT_TYPE_HEADER,
  AGENT_CHARGE_AI_CREDITS_HEADER,
  AGENT_CHAT_HEADER,
  AGENT_COLLECTION_HEADER,
  AGENT_CONTENT_HEADER,
  AGENT_CONTENT_TYPE_HEADER,
  AGENT_GENERATION_CONFIG_HEADER,
  AGENT_ORGANIZATION_HEADER,
  AGENT_SERVICE_USERNAME,
  AGENT_SOURCE_METADATA_HEADER,
  AGENT_SURFACE_HEADER,
  AGENT_USE_MARKUP_HEADER,
  AGENT_USER_HEADER,
  AGENT_VOICE_HEADER,
} from "@notra/ai/constants/agent";
import { createAgentSessionWithMapping } from "@notra/ai/utils/agent-proxy";
import { db } from "@notra/db/drizzle";
import { agentSessions } from "@notra/db/schema";
import {
  AgentTaskFailedError,
  AgentTaskTimeoutError,
  agentStreamEventSchema,
} from "@notra/schemas/dashboard/agent";
import { getVercelOidcToken } from "@vercel/oidc";
import { eq } from "drizzle-orm";
import { Client } from "eve/client";

import {
  AGENT_CREATE_SESSION_PATH,
  AGENT_TASK_POLL_INTERVAL_MS,
  AGENT_TASK_TIMEOUT_MS,
  AGENT_TRAILING_SLASH_PATTERN,
} from "@/constants/agent";
import type {
  AgentSessionScope,
  AgentTaskRunResult,
  StartAgentSessionInput,
  StartAgentSessionResult,
} from "@/types/agent";

function getNotraAgentUrl(): string {
  const url = process.env.EVE_NOTRA_AGENT_URL;
  if (!url) {
    throw new Error("EVE_NOTRA_AGENT_URL is not configured");
  }
  return url.replace(AGENT_TRAILING_SLASH_PATTERN, "");
}

function buildAgentScopeHeaders(
  scope: AgentSessionScope
): Record<string, string> {
  const headers: Record<string, string> = {
    [AGENT_ORGANIZATION_HEADER]: scope.organizationId,
    [AGENT_SURFACE_HEADER]: scope.surface,
  };
  if (scope.userId) {
    headers[AGENT_USER_HEADER] = scope.userId;
  }
  if (scope.chatId) {
    headers[AGENT_CHAT_HEADER] = scope.chatId;
  }
  if (scope.contentId) {
    headers[AGENT_CONTENT_HEADER] = scope.contentId;
  }
  if (scope.collectionId) {
    headers[AGENT_COLLECTION_HEADER] = scope.collectionId;
  }
  if (scope.contentType) {
    headers[AGENT_CONTENT_TYPE_HEADER] = scope.contentType;
  }
  if (scope.autoPublish !== undefined) {
    headers[AGENT_AUTO_PUBLISH_HEADER] = scope.autoPublish ? "true" : "false";
  }
  if (scope.useMarkup !== undefined) {
    headers[AGENT_USE_MARKUP_HEADER] = scope.useMarkup ? "true" : "false";
  }
  if (scope.chargeAiCredits !== undefined) {
    headers[AGENT_CHARGE_AI_CREDITS_HEADER] = scope.chargeAiCredits
      ? "true"
      : "false";
  }
  if (scope.voiceId) {
    headers[AGENT_VOICE_HEADER] = scope.voiceId;
  }
  if (scope.brandAgentType) {
    headers[AGENT_BRAND_AGENT_TYPE_HEADER] = scope.brandAgentType;
  }
  if (scope.sourceMetadata) {
    headers[AGENT_SOURCE_METADATA_HEADER] = JSON.stringify(
      scope.sourceMetadata
    );
  }
  if (scope.generationConfig) {
    headers[AGENT_GENERATION_CONFIG_HEADER] = JSON.stringify(
      scope.generationConfig
    );
  }
  return headers;
}

export async function createNotraAgentClient(
  scope: AgentSessionScope
): Promise<Client> {
  const clientOptions = {
    headers: buildAgentScopeHeaders(scope),
    host: getNotraAgentUrl(),
    redirect: "error" as const,
  };

  const token = await getVercelOidcToken().catch(() => null);
  if (token) {
    return new Client({ ...clientOptions, auth: { vercelOidc: { token } } });
  }

  const password = process.env.EVE_NOTRA_AGENT_PASSWORD;
  if (password) {
    return new Client({
      ...clientOptions,
      auth: {
        basic: { password, username: AGENT_SERVICE_USERNAME },
      },
    });
  }

  throw new Error(
    "Notra agent auth is not configured: enable Vercel OIDC federation or set EVE_NOTRA_AGENT_PASSWORD"
  );
}

export async function startAgentSession(
  input: StartAgentSessionInput
): Promise<StartAgentSessionResult> {
  const client = await createNotraAgentClient(input.scope);
  return await createAgentSessionWithMapping({
    fetchUpstream: (path, init) => client.fetch(path, init),
    scope: {
      organizationId: input.scope.organizationId,
      userId: input.scope.userId,
      chatId: input.scope.chatId,
      surface: input.scope.surface,
      contentId: input.scope.contentId,
      collectionId: input.scope.collectionId,
    },
    message: input.message,
    mode: input.mode,
    outputSchema: input.outputSchema,
  });
}

async function readTaskResultFromStream(
  client: Client,
  eveSessionId: string
): Promise<{ output: unknown } | { failed: string } | null> {
  const response = await client.fetch(
    `${AGENT_CREATE_SESSION_PATH}/${eveSessionId}/stream`,
    { method: "GET" }
  );
  if (!(response.ok && response.body)) {
    return null;
  }
  const text = await response.text();
  let output: unknown;
  let completed = false;
  let failed: string | null = null;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let event: { type: string; data?: Record<string, unknown> };
    try {
      event = agentStreamEventSchema.parse(JSON.parse(trimmed));
    } catch {
      continue;
    }
    if (event.type === "result.completed") {
      output = event.data?.output ?? event.data?.result ?? event.data;
    }
    if (event.type === "session.completed") {
      completed = true;
    }
    if (event.type === "session.failed") {
      failed =
        typeof event.data?.message === "string"
          ? event.data.message
          : "unknown failure";
    }
  }
  if (failed) {
    return { failed };
  }
  if (completed) {
    return { output };
  }
  return null;
}

export async function runAgentTask(
  input: StartAgentSessionInput
): Promise<AgentTaskRunResult> {
  const [client, started] = await Promise.all([
    createNotraAgentClient(input.scope),
    startAgentSession({ ...input, mode: "task" }),
  ]);

  const deadline = Date.now() + AGENT_TASK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await readTaskResultFromStream(client, started.eveSessionId);
    if (result && "failed" in result) {
      await db
        .update(agentSessions)
        .set({ status: "failed" })
        .where(eq(agentSessions.id, started.agentSessionId));
      throw new AgentTaskFailedError(started.eveSessionId, result.failed);
    }
    if (result) {
      await db
        .update(agentSessions)
        .set({ status: "completed" })
        .where(eq(agentSessions.id, started.agentSessionId));
      return { eveSessionId: started.eveSessionId, output: result.output };
    }
    await new Promise((resolvePoll) =>
      setTimeout(resolvePoll, AGENT_TASK_POLL_INTERVAL_MS)
    );
  }

  await db
    .update(agentSessions)
    .set({ status: "timed_out" })
    .where(eq(agentSessions.id, started.agentSessionId));
  throw new AgentTaskTimeoutError(started.eveSessionId);
}
