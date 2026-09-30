import { randomUUID } from "node:crypto";

import { AGENT_SESSION_ROUTE_PATH } from "@notra/ai/constants/agent";
import { createSessionResponseSchema } from "@notra/ai/schemas/agent-proxy";
import type {
  CreateAgentSessionParams,
  CreateAgentSessionResult,
  ForwardAgentFollowUpParams,
  ForwardAgentStreamParams,
} from "@notra/ai/types/agent-proxy";
import {
  acquireAgentSendLock,
  releaseAgentSendLock,
} from "@notra/ai/utils/agent-session-lock";
import { db } from "@notra/db/drizzle";
import { agentSessions } from "@notra/db/schema";
import { and, desc, eq } from "drizzle-orm";

export class AgentSendLockedError extends Error {
  constructor(eveSessionId: string) {
    super(`A message is already being processed for session ${eveSessionId}`);
    this.name = "AgentSendLockedError";
  }
}

export async function createAgentSessionWithMapping(
  params: CreateAgentSessionParams
): Promise<CreateAgentSessionResult> {
  const response = await params.fetchUpstream(AGENT_SESSION_ROUTE_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      ...(params.mode ? { mode: params.mode } : {}),
      ...(params.outputSchema ? { outputSchema: params.outputSchema } : {}),
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Agent session creation failed with status ${response.status}: ${body.slice(0, 500)}`
    );
  }
  const payload = createSessionResponseSchema.parse(await response.json());

  const generatedSessionId = randomUUID();
  const inserted = await db
    .insert(agentSessions)
    .values({
      id: generatedSessionId,
      organizationId: params.scope.organizationId,
      userId: params.scope.userId ?? null,
      chatId: params.scope.chatId ?? null,
      surface: params.scope.surface,
      contentId: params.scope.contentId ?? null,
      collectionId: params.scope.collectionId ?? null,
      eveSessionId: payload.sessionId,
    })
    .onConflictDoNothing({ target: agentSessions.eveSessionId })
    .returning({ id: agentSessions.id });

  let agentSessionId = inserted[0]?.id;
  if (!agentSessionId) {
    const [existing] = await db
      .select({ id: agentSessions.id })
      .from(agentSessions)
      .where(eq(agentSessions.eveSessionId, payload.sessionId))
      .limit(1);
    if (!existing) {
      throw new Error(
        `Agent session mapping missing for eve session ${payload.sessionId}`
      );
    }
    agentSessionId = existing.id;
  }

  return {
    agentSessionId,
    eveSessionId: payload.sessionId,
  };
}

export async function forwardAgentFollowUp(
  params: ForwardAgentFollowUpParams
): Promise<Response> {
  const lockAcquired = await acquireAgentSendLock(params.eveSessionId);
  if (!lockAcquired) {
    throw new AgentSendLockedError(params.eveSessionId);
  }
  try {
    const upstream = await params.fetchUpstream(
      `${AGENT_SESSION_ROUTE_PATH}/${params.eveSessionId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(params.message ? { message: params.message } : {}),
          ...(params.inputResponses?.length
            ? { inputResponses: params.inputResponses }
            : {}),
        }),
      }
    );
    const upstreamText = await upstream.text();
    return new Response(upstreamText, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } finally {
    await releaseAgentSendLock(params.eveSessionId);
  }
}

export async function forwardAgentStream(
  params: ForwardAgentStreamParams
): Promise<Response> {
  const upstream = await params.fetchUpstream(
    `${AGENT_SESSION_ROUTE_PATH}/${params.eveSessionId}/stream${
      params.startIndex
        ? `?startIndex=${encodeURIComponent(params.startIndex)}`
        : ""
    }`,
    { method: "GET" }
  );
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ??
        "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function getAgentSessionMapping(
  organizationId: string,
  eveSessionId: string
) {
  return await db.query.agentSessions.findFirst({
    where: and(
      eq(agentSessions.organizationId, organizationId),
      eq(agentSessions.eveSessionId, eveSessionId)
    ),
  });
}

export async function listAgentSessionMappings(
  organizationId: string,
  limit: number
) {
  return await db.query.agentSessions.findMany({
    where: eq(agentSessions.organizationId, organizationId),
    orderBy: [desc(agentSessions.createdAt)],
    limit,
  });
}
