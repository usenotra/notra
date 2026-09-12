import { checkChatBilling } from "@notra/ai/billing/chat-billing";
import { AGENT_SURFACES } from "@notra/ai/constants/agent";
import {
  AgentSendLockedError,
  forwardAgentFollowUp,
  forwardAgentStream,
  getAgentSessionMapping,
} from "@notra/ai/utils/agent-proxy";
import { db } from "@notra/db/drizzle";
import { posts } from "@notra/db/schema";
import {
  agentProxyCreateSessionSchema,
  agentProxyFollowUpSchema,
} from "@notra/schemas/dashboard/agent-proxy";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AGENT_PROXY_ALLOWED_PATHS } from "@/constants/agent";
import { createNotraAgentClient, startAgentSession } from "@/lib/agent/client";
import { isAgentChatEnabled } from "@/lib/agent/flag";
import { withOrganizationAuth } from "@/lib/auth/organization";
import type { AgentSurface } from "@/types/agent";
import { enforceChatGenerationRatelimit } from "@/utils/chat-ratelimit";

export const maxDuration = 800;

interface AgentRouteContext {
  params: Promise<{ organizationId: string; eve: string[] }>;
}

function resolveAllowedPath(segments: string[]): string | null {
  const path = segments.join("/");
  return AGENT_PROXY_ALLOWED_PATHS.some((pattern) => pattern.test(path))
    ? path
    : null;
}

function resolveSurface(request: NextRequest): AgentSurface {
  const requested = request.headers.get("x-agent-surface");
  const match = AGENT_SURFACES.find(
    (surface) => surface === requested && surface !== "task"
  );
  return match ?? "standalone-chat";
}

async function resolveContentId(
  request: NextRequest,
  organizationId: string
): Promise<{ contentId?: string; error?: NextResponse }> {
  const contentId = request.headers.get("x-agent-content-id");
  if (!contentId) {
    return {};
  }
  const post = await db.query.posts.findFirst({
    columns: { id: true },
    where: and(
      eq(posts.id, contentId),
      eq(posts.organizationId, organizationId)
    ),
  });
  if (!post) {
    return {
      error: NextResponse.json({ error: "Content not found" }, { status: 404 }),
    };
  }
  return { contentId };
}

async function checkAiCredits(organizationId: string): Promise<{
  useMarkup: boolean;
  chargeAiCredits: boolean;
  error?: NextResponse;
}> {
  let billing: Awaited<ReturnType<typeof checkChatBilling>>;
  try {
    billing = await checkChatBilling(organizationId);
  } catch {
    return {
      useMarkup: false,
      chargeAiCredits: false,
      error: NextResponse.json(
        { error: "Failed to check usage limits", code: "BILLING_ERROR" },
        { status: 500 }
      ),
    };
  }
  if (!billing.allowed) {
    return {
      useMarkup: false,
      chargeAiCredits: false,
      error: NextResponse.json(
        {
          error: "Usage limit reached",
          code: "USAGE_LIMIT_REACHED",
          balance: billing.balanceRemaining ?? 0,
        },
        { status: 403 }
      ),
    };
  }
  return {
    useMarkup: billing.useMarkup,
    chargeAiCredits: billing.chargeAiCredits,
  };
}

export async function POST(request: NextRequest, context: AgentRouteContext) {
  if (!isAgentChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { organizationId, eve } = await context.params;
  const auth = await withOrganizationAuth(request, organizationId);
  if (!auth.success) {
    return auth.response;
  }
  const path = resolveAllowedPath(eve);
  if (!path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rateLimited = await enforceChatGenerationRatelimit(
    organizationId,
    auth.context.user.id
  );
  if (rateLimited) {
    return rateLimited;
  }
  const credits = await checkAiCredits(organizationId);
  if (credits.error) {
    return credits.error;
  }

  const body = await request.json().catch(() => null);

  if (path === "eve/v1/session") {
    const parsed = agentProxyCreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }
    const surface = resolveSurface(request);
    const { contentId, error } = await resolveContentId(
      request,
      organizationId
    );
    if (error) {
      return error;
    }
    try {
      const started = await startAgentSession({
        scope: {
          organizationId,
          userId: auth.context.user.id,
          surface,
          contentId,
          useMarkup: credits.useMarkup,
          chargeAiCredits: credits.chargeAiCredits,
        },
        message: parsed.data.message,
      });
      return NextResponse.json(
        {
          ok: true,
          sessionId: started.eveSessionId,
          continuationToken: started.continuationToken,
        },
        { headers: { "x-eve-session-id": started.eveSessionId } }
      );
    } catch (startError) {
      console.error("[agent-proxy] Session creation failed", startError);
      return NextResponse.json(
        { error: "Agent session creation failed" },
        { status: 502 }
      );
    }
  }

  const eveSessionId = eve[3];
  if (!eveSessionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const mapping = await getAgentSessionMapping(organizationId, eveSessionId);
  if (!mapping || (mapping.userId && mapping.userId !== auth.context.user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = agentProxyFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const client = await createNotraAgentClient({
    organizationId,
    userId: auth.context.user.id,
    surface:
      AGENT_SURFACES.find((value) => value === mapping.surface) ??
      "standalone-chat",
    contentId: mapping.contentId ?? undefined,
    useMarkup: credits.useMarkup,
    chargeAiCredits: credits.chargeAiCredits,
  });
  try {
    return await forwardAgentFollowUp({
      fetchUpstream: (upstreamPath, init) => client.fetch(upstreamPath, init),
      eveSessionId,
      continuationToken: mapping.continuationToken,
      message: parsed.data.message,
      inputResponses: parsed.data.inputResponses,
    });
  } catch (error) {
    if (error instanceof AgentSendLockedError) {
      return NextResponse.json(
        { error: "A message is already being processed for this session" },
        { status: 409 }
      );
    }
    throw error;
  }
}

export async function GET(request: NextRequest, context: AgentRouteContext) {
  if (!isAgentChatEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { organizationId, eve } = await context.params;
  const auth = await withOrganizationAuth(request, organizationId);
  if (!auth.success) {
    return auth.response;
  }
  const path = resolveAllowedPath(eve);
  if (!path?.endsWith("/stream")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rateLimited = await enforceChatGenerationRatelimit(
    organizationId,
    auth.context.user.id
  );
  if (rateLimited) {
    return rateLimited;
  }
  const eveSessionId = eve[3];
  const mapping = eveSessionId
    ? await getAgentSessionMapping(organizationId, eveSessionId)
    : null;
  if (
    !(mapping && eveSessionId) ||
    (mapping.userId && mapping.userId !== auth.context.user.id)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await createNotraAgentClient({
    organizationId,
    surface:
      AGENT_SURFACES.find((value) => value === mapping.surface) ??
      "standalone-chat",
  });
  return await forwardAgentStream({
    fetchUpstream: (upstreamPath, init) => client.fetch(upstreamPath, init),
    eveSessionId,
    startIndex: request.nextUrl.searchParams.get("startIndex"),
  });
}
